/**
 * Shared Azure Document Intelligence OCR + domain parse dispatch.
 * OCR returns Markdown (`outputContentFormat=markdown`) so LLMs see tables.
 * Invoice → {@link InvoiceParseService} (mid-tier model)
 * ABE → {@link AbeParseService} (economy model)
 */

import type {
  ApprovalFieldKind,
  ApprovalFields,
} from "@/lib/documents/approval-fields";

import { getDocumentIntelligenceEnv } from "./document-intelligence-env";
import { extractApprovalFieldsFromText } from "./extract-approval-fields";
import { inferInvoiceCategory } from "./infer-invoice-category";
import { isLlmConfigured } from "./llm-client";
import { documentTypeFromParseKind, resolveParseModel } from "./model-routing";
import { normalizeOcrMarkdown } from "./normalize-ocr-markdown";
import type {
  DocumentParseKind,
  OcrDocumentType,
  OcrJsonPayload,
} from "./ocr-types";
import { TextParseError } from "./parse-error";
import { invoiceParseService } from "./services/invoice-parse-service";
import {
  normalizeTextParseResult,
  type InvoiceTextParseResult,
} from "./text-parse-schema";
import {
  abeExtractionService,
  coverTextFromPageBlocks,
  resolveAbeContextModel,
  truncateAbeCoverPages,
} from "@/services/ocr/AbeExtractionService";
import { paragraph21ExtractionService } from "@/services/ocr/Paragraph21ExtractionService";
import { teilegutachtenExtractionService } from "@/services/ocr/TeilegutachtenExtractionService";
import {
  formatAbeKbaDisplay,
  type AbeMinimal,
  type AbeVehicleContext,
} from "@/lib/validations/abeSchema";
import { MissingVinError } from "@/lib/validations/paragraph21Schema";
import {
  paragraph21ToAnalyzeFields,
  paragraph21ToApprovalFields,
} from "@/lib/validations/paragraph21Schema";
import {
  teilegutachtenToAnalyzeFields,
  teilegutachtenToApprovalFields,
} from "@/lib/validations/teilegutachtenSchema";

export type { DocumentParseKind, OcrDocumentType, OcrJsonPayload } from "./ocr-types";

const API_VERSION = "2024-11-30";
/**
 * Layout preserves table structure in Markdown better than prebuilt-read.
 * Critical for invoice line-item extraction.
 */
const MODEL_ID = "prebuilt-layout";
const LOCALE = "de-DE";
const CONTENT_FORMAT = "markdown" as const;
const POLL_INTERVAL_MS = 700;
const POLL_TIMEOUT_MS = 60_000;
const MAX_OCR_TEXT_CHARS = 48_000;

export class DocumentIntelligenceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DocumentIntelligenceError";
  }
}

type DiLine = {
  content?: string;
};

type DiPage = {
  pageNumber?: number;
  lines?: DiLine[];
};

type DiParagraph = {
  content?: string;
};

type DiAnalyzeResult = {
  content?: string;
  contentFormat?: string;
  pages?: DiPage[];
  paragraphs?: DiParagraph[];
};

export type AnalyzeDocumentResult = {
  kind: "invoice" | "abe";
  documentType: OcrDocumentType;
  fields: InvoiceTextParseResult;
  /** Structured subtype payload for upload → `documents.approval_fields`. */
  approvalFields: ApprovalFields | null;
  rawText: string;
  ocrJson: OcrJsonPayload;
  /** Azure DI model id (layout / read). */
  modelId: string;
  /** Chat deployment used for structured parse. */
  parseModel: string;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function buildAnalyzeUrl(endpoint: string): string {
  const params = new URLSearchParams({
    "api-version": API_VERSION,
    locale: LOCALE,
    outputContentFormat: CONTENT_FORMAT,
  });
  return (
    `${endpoint}documentintelligence/documentModels/${MODEL_ID}:analyze` +
    `?${params.toString()}`
  );
}

async function startAnalyze(input: {
  endpoint: string;
  apiKey: string;
  bytes: Buffer;
  contentType: string;
}): Promise<Response> {
  try {
    return await fetch(buildAnalyzeUrl(input.endpoint), {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": input.apiKey,
        "Content-Type": input.contentType || "application/octet-stream",
      },
      body: new Uint8Array(input.bytes),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Netzwerkfehler.";
    throw new DocumentIntelligenceError(
      `Dokumentanalyse nicht erreichbar: ${message}`,
    );
  }
}

async function pollAnalyzeResult(
  operationLocation: string,
  apiKey: string,
): Promise<DiAnalyzeResult> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < POLL_TIMEOUT_MS) {
    await sleep(POLL_INTERVAL_MS);

    let pollResponse: Response;
    try {
      pollResponse = await fetch(operationLocation, {
        headers: {
          "Ocp-Apim-Subscription-Key": apiKey,
        },
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Netzwerkfehler.";
      throw new DocumentIntelligenceError(
        `Dokumentanalyse nicht erreichbar: ${message}`,
      );
    }

    if (!pollResponse.ok) {
      // Never reflect Azure error bodies to clients (may include request metadata).
      void (await pollResponse.text().catch(() => ""));
      throw new DocumentIntelligenceError(
        `Dokumentanalyse fehlgeschlagen (${pollResponse.status}).`,
      );
    }

    const payload = (await pollResponse.json()) as {
      status?: string;
      analyzeResult?: DiAnalyzeResult;
      error?: { message?: string };
    };

    if (payload.status === "succeeded" && payload.analyzeResult) {
      return payload.analyzeResult;
    }

    if (payload.status === "failed") {
      throw new DocumentIntelligenceError(
        payload.error?.message || "Dokumentanalyse fehlgeschlagen.",
      );
    }
  }

  throw new DocumentIntelligenceError(
    "Analyse dauert zu lange — bitte erneut versuchen.",
  );
}

/**
 * Prefer Azure Markdown `content` (tables as HTML/MD). Fall back to line OCR.
 */
export function buildOcrJsonPayload(result: DiAnalyzeResult): OcrJsonPayload {
  const markdown = (result.content ?? "").trim();
  const pages = result.pages ?? [];

  const rawPageBodies = pages.map((page) =>
    (page.lines ?? [])
      .map((line) => line.content?.trim())
      .filter((value): value is string => Boolean(value))
      .join("\n"),
  );

  const pageBlocks = rawPageBodies.map((body, index) => {
    if (!body) return "";
    if (pages.length <= 1) return body;
    return `--- Seite ${pages[index]?.pageNumber ?? index + 1} ---\n${body}`;
  });

  let plainFallback = pageBlocks.filter(Boolean).join("\n\n").trim();
  if (plainFallback.length < 8) {
    plainFallback = (result.paragraphs ?? [])
      .map((paragraph) => paragraph.content?.trim())
      .filter((value): value is string => Boolean(value))
      .join("\n")
      .trim();
  }

  const useMarkdown = markdown.length >= 8;
  // Convert Azure HTML <table>/<td> blocks to pipe rows so parsers never see tags.
  const text = normalizeOcrMarkdown(useMarkdown ? markdown : plainFallback);

  const firstPageLines = (pages[0]?.lines ?? [])
    .map((line) => line.content?.trim())
    .filter((value): value is string => Boolean(value));

  const coverFromPages = coverTextFromPageBlocks(rawPageBodies, 2);
  const coverText =
    coverFromPages.length >= 8
      ? coverFromPages
      : truncateAbeCoverPages(text, 2);

  return {
    modelId: MODEL_ID,
    locale: LOCALE,
    pageCount: Math.max(1, pages.length || 1),
    text: text.slice(0, MAX_OCR_TEXT_CHARS),
    coverText,
    headerLines: firstPageLines.slice(0, 12),
    contentFormat: useMarkdown ? "markdown" : "text",
  };
}

/** Map minimal extract → analyze API shape (summary + optional vehicle match). */
export function abeMinimalToAnalyzeFields(
  abe: AbeMinimal,
): InvoiceTextParseResult {
  const kbaDisplay = formatAbeKbaDisplay(abe.kbaNumber);
  const partLabel =
    [abe.partCategory, abe.partType].filter(Boolean).join(" · ") || null;

  const matchNotes = [
    abe.userVehicleMatchStatus
      ? `Fahrzeug-Check: ${abe.userVehicleMatchStatus}`
      : null,
    abe.matchedVehicleRow
      ? `Trefferzeile: ${abe.matchedVehicleRow}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  return normalizeTextParseResult({
    vendor: abe.partType ?? abe.partCategory,
    date: null,
    amount: null,
    category: "abe",
    summary: partLabel?.slice(0, 80) ?? null,
    lineItems: null,
    kbaNumber: kbaDisplay,
    vehicleApprovals: abe.matchedVehicleRow ? [abe.matchedVehicleRow] : null,
    authority: abe.testingOrganization,
    conditions: abe.matchedConditions,
    partCategory: abe.partCategory,
    notes: matchNotes || null,
    manufacturer: abe.manufacturer,
    invoiceNumber: null,
    mileageKm: null,
  });
}

async function runDocumentOcr(input: {
  bytes: Buffer;
  contentType: string;
}): Promise<OcrJsonPayload> {
  const { endpoint, apiKey, isConfigured } = getDocumentIntelligenceEnv();
  if (!isConfigured) {
    throw new DocumentIntelligenceError(
      "Dokumentanalyse ist nicht konfiguriert.",
    );
  }

  const startResponse = await startAnalyze({
    endpoint,
    apiKey,
    bytes: input.bytes,
    contentType: input.contentType,
  });

  if (!startResponse.ok) {
    void (await startResponse.text().catch(() => ""));
    throw new DocumentIntelligenceError(
      `Dokumentanalyse fehlgeschlagen (${startResponse.status}).`,
    );
  }

  const operationLocation = startResponse.headers.get("operation-location");
  if (!operationLocation) {
    throw new DocumentIntelligenceError(
      "Dokumentanalyse konnte nicht gestartet werden.",
    );
  }

  const analyzeResult = await pollAnalyzeResult(operationLocation, apiKey);
  const ocrJson = buildOcrJsonPayload(analyzeResult);

  if (ocrJson.text.length < 8) {
    throw new DocumentIntelligenceError(
      "Zu wenig Text erkannt. Bitte schärferes, gut ausgeleuchtetes Foto versuchen.",
    );
  }

  return ocrJson;
}

function resolveDocumentType(input: {
  documentType?: OcrDocumentType;
  kind?: DocumentParseKind;
  ocrText: string;
}): OcrDocumentType {
  if (input.documentType) return input.documentType;

  const inferred = inferInvoiceCategory(input.ocrText);
  const kind = input.kind ?? "auto";
  return documentTypeFromParseKind(
    kind === "abe" ? "abe" : kind === "invoice" ? "invoice" : "auto",
    inferred,
  );
}

/**
 * OCR (Markdown) → domain parse service with dynamic model routing.
 */
export async function analyzeDocument(input: {
  bytes: Buffer;
  contentType: string;
  kind?: DocumentParseKind;
  documentType?: OcrDocumentType;
  /** Explicit subtype from scan-type picker — skips OCR guessing. */
  approvalKind?: ApprovalFieldKind | null;
  /**
   * Garage vehicle for ABE Verwendungsbereich match.
   * When omitted, only cover-page base metadata is extracted.
   */
  vehicleContext?: AbeVehicleContext | null;
  /** Garage twin VIN — required for §21 Einzelabnahme Field E verification. */
  garageVin?: string | null;
}): Promise<AnalyzeDocumentResult> {
  if (!isLlmConfigured()) {
    throw new DocumentIntelligenceError(
      "Dokumentanalyse ist nicht vollständig konfiguriert.",
    );
  }

  const ocrJson = await runDocumentOcr(input);
  const documentType = resolveDocumentType({
    documentType: input.documentType,
    kind: input.kind,
    ocrText: ocrJson.text,
  });
  const preferredApprovalKind = input.approvalKind ?? null;
  const vehicleContext = input.vehicleContext ?? null;

  const ocrPayload: OcrJsonPayload = ocrJson;

  const ocrJsonForApi = JSON.stringify({
    headerLines: ocrPayload.headerLines,
    text: ocrPayload.text,
    pageCount: ocrPayload.pageCount,
    contentFormat: ocrPayload.contentFormat,
  });

  try {
    if (documentType === "abe") {
      const textSource = ocrPayload.text;

      // §21 Einzelabnahme — dedicated extractor (VIN-bound, Field 22 verbatim).
      if (preferredApprovalKind === "einzelabnahme") {
        const paragraph21 =
          await paragraph21ExtractionService.extractParagraph21(textSource, {
            garageVin: input.garageVin ?? null,
          });
        return {
          kind: "abe",
          documentType,
          fields: paragraph21ToAnalyzeFields(
            paragraph21,
            paragraph21.vinMatchesGarage,
          ),
          approvalFields: paragraph21ToApprovalFields(paragraph21),
          rawText: textSource,
          ocrJson: {
            ...ocrPayload,
            text: textSource,
          },
          modelId: MODEL_ID,
          parseModel: resolveAbeContextModel(),
        };
      }

      // § 19 Abs. 3 Teilegutachten — dedicated extractor (Kennzeichnung + Anbauabnahme flag).
      if (preferredApprovalKind === "teilegutachten") {
        const teilegutachten =
          await teilegutachtenExtractionService.extractTeilegutachten(
            textSource,
            { vehicleContext },
          );
        return {
          kind: "abe",
          documentType,
          fields: teilegutachtenToAnalyzeFields(teilegutachten),
          approvalFields: teilegutachtenToApprovalFields(teilegutachten),
          rawText: textSource,
          ocrJson: {
            ...ocrPayload,
            text: textSource,
          },
          modelId: MODEL_ID,
          parseModel: resolveAbeContextModel(),
        };
      }

      // ABE / EG-BE — cover or context-aware table scan.
      const abeTextSource = vehicleContext
        ? textSource
        : ocrPayload.coverText.trim().length >= 8
          ? ocrPayload.coverText
          : textSource;
      const abe = await abeExtractionService.extractFromText(abeTextSource, {
        vehicleContext,
      });
      const gutachtenKind =
        preferredApprovalKind && preferredApprovalKind !== "tuev"
          ? preferredApprovalKind
          : undefined;
      const approvalFields = extractApprovalFieldsFromText(
        abeTextSource,
        gutachtenKind,
      );
      return {
        kind: "abe",
        documentType,
        fields: abeMinimalToAnalyzeFields(abe),
        approvalFields:
          approvalFields.kind === "tuev" ? { kind: "abe" } : approvalFields,
        rawText: abeTextSource,
        ocrJson: {
          ...ocrPayload,
          text: abeTextSource,
        },
        modelId: MODEL_ID,
        parseModel: vehicleContext
          ? resolveAbeContextModel()
          : resolveParseModel("abe"),
      };
    }

    // invoice | tuev → same invoice schema; final category comes from merge heuristics.
    const parseModel = resolveParseModel(
      documentType === "tuev" ? "tuev" : "invoice",
    );
    const parsed = await invoiceParseService.parseFromText(ocrJsonForApi, {
      model: parseModel,
    });
    const fields = invoiceParseService.mergeWithOcr(parsed, ocrPayload);
    // Explicit scan type wins; otherwise never promote weak TÜV guesses on bills.
    const resolvedType: OcrDocumentType =
      input.documentType === "tuev" || preferredApprovalKind === "tuev"
        ? "tuev"
        : input.documentType === "invoice"
          ? "invoice"
          : fields.category === "tuev"
            ? "tuev"
            : "invoice";
    const approvalFields =
      resolvedType === "tuev"
        ? extractApprovalFieldsFromText(ocrPayload.text, "tuev")
        : null;
    return {
      kind: "invoice",
      documentType: resolvedType,
      fields:
        resolvedType === "tuev" ? { ...fields, category: "tuev" } : fields,
      approvalFields:
        approvalFields?.kind === "tuev" ? approvalFields : null,
      rawText: ocrPayload.text,
      ocrJson: ocrPayload,
      modelId: MODEL_ID,
      parseModel,
    };
  } catch (error) {
    if (error instanceof MissingVinError) {
      throw new DocumentIntelligenceError(error.message);
    }
    const message =
      error instanceof TextParseError
        ? error.message
        : error instanceof Error
          ? error.message
          : "LLM parse failed.";
    throw new DocumentIntelligenceError(message);
  }
}

/**
 * @deprecated Prefer {@link analyzeDocument}.
 */
export async function analyzeInvoiceDocument(input: {
  bytes: Buffer;
  contentType: string;
}): Promise<{
  fields: InvoiceTextParseResult;
  rawText: string;
  ocrJson: OcrJsonPayload;
  modelId: string;
}> {
  const result = await analyzeDocument({ ...input, kind: "auto" });
  return {
    fields: result.fields,
    rawText: result.rawText,
    ocrJson: result.ocrJson,
    modelId: result.modelId,
  };
}
