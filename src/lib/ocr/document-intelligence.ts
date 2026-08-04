/**
 * Shared Azure Document Intelligence OCR + domain parse dispatch.
 * OCR returns Markdown (`outputContentFormat=markdown`) so LLMs see tables.
 * Invoice → {@link InvoiceParseService} (mid-tier model)
 * ABE → {@link AbeParseService} (economy model)
 */

import { budgetAbeOcrText } from "./abe-from-text";
import { getDocumentIntelligenceEnv } from "./document-intelligence-env";
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
import { abeParseService } from "./services/abe-parse-service";
import { invoiceParseService } from "./services/invoice-parse-service";
import type { InvoiceTextParseResult } from "./text-parse-schema";

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
      const detail = (await pollResponse.text()).slice(0, 400);
      throw new DocumentIntelligenceError(
        `Dokumentanalyse fehlgeschlagen (${pollResponse.status}): ${detail}`,
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

  const pageBlocks = pages.map((page, index) => {
    const lines = (page.lines ?? [])
      .map((line) => line.content?.trim())
      .filter((value): value is string => Boolean(value));
    const body = lines.join("\n");
    if (pages.length <= 1) return body;
    return `--- Seite ${page.pageNumber ?? index + 1} ---\n${body}`;
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

  return {
    modelId: MODEL_ID,
    locale: LOCALE,
    pageCount: Math.max(1, pages.length || 1),
    text: text.slice(0, MAX_OCR_TEXT_CHARS),
    headerLines: firstPageLines.slice(0, 12),
    contentFormat: useMarkdown ? "markdown" : "text",
  };
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
    const detail = (await startResponse.text()).slice(0, 400);
    throw new DocumentIntelligenceError(
      `Dokumentanalyse fehlgeschlagen (${startResponse.status}): ${detail}`,
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
  const parseModel = resolveParseModel(documentType);

  // ABE: keep Auflagen budget helper; invoices keep full Markdown slice.
  const textForParse =
    documentType === "abe"
      ? budgetAbeOcrText(ocrJson.text, MAX_OCR_TEXT_CHARS)
      : ocrJson.text;

  const ocrPayload: OcrJsonPayload = {
    ...ocrJson,
    text: textForParse,
  };

  const ocrJsonForApi = JSON.stringify({
    headerLines: ocrPayload.headerLines,
    text: ocrPayload.text,
    pageCount: ocrPayload.pageCount,
    contentFormat: ocrPayload.contentFormat,
  });

  try {
    if (documentType === "abe") {
      const abe = await abeParseService.parseFromText(ocrPayload.text, {
        documentType: "abe",
        model: parseModel,
      });
      return {
        kind: "abe",
        documentType,
        fields: abeParseService.toAnalyzeFields(abe, ocrPayload.text),
        rawText: ocrPayload.text,
        ocrJson: ocrPayload,
        modelId: MODEL_ID,
        parseModel,
      };
    }

    // invoice | tuev → invoice schema; tuev uses economy model via routing.
    const parsed = await invoiceParseService.parseFromText(ocrJsonForApi, {
      model: parseModel,
    });
    const fields = invoiceParseService.mergeWithOcr(parsed, ocrPayload);
    return {
      kind: "invoice",
      documentType,
      fields:
        documentType === "tuev"
          ? { ...fields, category: "tuev", lineItems: fields.lineItems }
          : fields,
      rawText: ocrPayload.text,
      ocrJson: ocrPayload,
      modelId: MODEL_ID,
      parseModel,
    };
  } catch (error) {
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
