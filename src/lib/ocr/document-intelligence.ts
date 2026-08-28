/**
 * Document parse dispatch — adaptive routing for invoices:
 *   • PDFs   → hybrid layout+text first (all pages in markdown, deduplication)
 *   • Images → vision LLM first (Azure row guides / Z-markers on the image)
 * Each path falls back to the other on failure.
 */

import type {
  ApprovalFieldKind,
  ApprovalFields,
} from "@/lib/documents/approval-fields";

import {
  extractMarkdownFromAzureLayout,
  isAzureMarkdownLayoutAvailable,
} from "./azure-markdown-layout";
import { isPdfBuffer, resolveDocumentContentType } from "./document-bytes";
import type { DocumentBytesInput } from "./llm-document-content";
import { isLlmConfigured } from "./llm-client";
import {
  buildStubOcrPayload,
  LLM_VISION_PARSE_MODEL_ID,
} from "./llm-document-content";
import { documentTypeFromParseKind, resolveInvoiceParseModel, resolveParseModel } from "./model-routing";
import type {
  DocumentParseKind,
  OcrDocumentType,
  OcrJsonPayload,
} from "./ocr-types";
import { TextParseError } from "./parse-error";
import { invoiceParseService } from "./services/invoice-parse-service";
import {
  normalizeTextParseResult,
  type InvoiceTextParseCategory,
  type InvoiceTextParseResult,
} from "./text-parse-schema";
import {
  isAzureDocumentIntelligenceConfigured,
} from "./azure-document-intelligence";
import {
  hybridInvoiceService,
} from "@/services/invoice/HybridInvoiceService";
import { preferInvoiceCategory } from "@/lib/ocr/infer-invoice-category";
import {
  extractVendorFromLogoHeader,
  mergeVisionVendorIntoInvoiceFields,
} from "@/lib/ocr/invoice-vendor-from-logo";
import { mapParsedInvoiceToTextParseResult } from "@/services/invoice/map-parsed-invoice-to-text-parse";
import {
  abeExtractionService,
  resolveAbeContextModel,
} from "@/services/ocr/AbeExtractionService";
import { egbeExtractionService } from "@/services/ocr/EgbeExtractionService";
import { paragraph21ExtractionService } from "@/services/ocr/Paragraph21ExtractionService";
import { gutachtenExtractionService } from "@/services/ocr/GutachtenExtractionService";
import { paragraph192ExtractionService } from "@/services/ocr/Paragraph192ExtractionService";
import { teilegutachtenExtractionService } from "@/services/ocr/TeilegutachtenExtractionService";
import { tuevExtractionService, tuevVisionToAnalyzeFields } from "@/services/ocr/TuevExtractionService";
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
  paragraph192ToAnalyzeFields,
  paragraph192ToApprovalFields,
} from "@/lib/validations/paragraph192Schema";
import {
  teilegutachtenToAnalyzeFields,
  teilegutachtenToApprovalFields,
} from "@/lib/validations/teilegutachtenSchema";
import {
  gutachtenToAnalyzeFields,
  gutachtenToApprovalFields,
  resolveGutachtenExtractionSubtype,
} from "@/lib/validations/gutachtenSchema";

export type { DocumentParseKind, OcrDocumentType, OcrJsonPayload } from "./ocr-types";

export class DocumentIntelligenceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DocumentIntelligenceError";
  }
}

/** Bundler-safe check — `instanceof` breaks across duplicated server chunks. */
export function isDocumentIntelligenceError(
  error: unknown,
): error is DocumentIntelligenceError {
  if (error instanceof DocumentIntelligenceError) return true;
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as Error).name === "DocumentIntelligenceError"
  );
}

export type AnalyzeDocumentResult = {
  kind: "invoice" | "abe";
  documentType: OcrDocumentType;
  fields: InvoiceTextParseResult;
  /** Structured subtype payload for upload → `documents.approval_fields`. */
  approvalFields: ApprovalFields | null;
  rawText: string;
  ocrJson: OcrJsonPayload;
  /** Parse source id returned to clients (`llm-vision` | `hybrid-layout-text`). */
  modelId: string;
  /** Chat deployment used for structured parse. */
  parseModel: string;
};

const HYBRID_INVOICE_MODEL_ID = "hybrid-layout-text";

function normalizeDocumentInput(input: {
  bytes: Buffer;
  contentType: string;
}): DocumentBytesInput {
  return {
    bytes: input.bytes,
    contentType: resolveDocumentContentType(input.bytes, input.contentType),
  };
}

function isPdfDocumentInput(input: DocumentBytesInput): boolean {
  return (
    input.contentType === "application/pdf" || isPdfBuffer(input.bytes)
  );
}

async function extractGutachtenMarkdownFromAzure(
  documentInput: DocumentBytesInput,
): Promise<{ markdown: string; ocrJson: OcrJsonPayload }> {
  const { markdown, pageCount } = await extractMarkdownFromAzureLayout(
    documentInput.bytes,
    documentInput.contentType,
  );
  return {
    markdown,
    ocrJson: buildOcrPayloadFromMarkdown(markdown, pageCount),
  };
}

/**
 * PDF Gutachten: Azure markdown first (all pages, no rasterization),
 * vision rasterization as fallback when Azure or text LLM fails.
 */
async function analyzeTeilegutachtenDocument(
  documentInput: DocumentBytesInput,
  vehicleContext: AbeVehicleContext | null,
  scope: "cover" | "marking" | "verwendungsbereich" | "full" = "full",
): Promise<{
  teilegutachten: Awaited<
    ReturnType<typeof teilegutachtenExtractionService.extractFromDocument>
  >;
  rawText: string;
  ocrJson: OcrJsonPayload;
  modelId: string;
}> {
  const runVision = async () => {
    const teilegutachten =
      scope === "cover"
        ? await teilegutachtenExtractionService.extractCoverPage(
            documentInput,
            { vehicleContext },
          )
        : scope === "marking"
          ? await teilegutachtenExtractionService.extractMarkingCapture(
              documentInput,
              { vehicleContext },
            )
          : scope === "verwendungsbereich"
            ? await teilegutachtenExtractionService.extractVerwendungsbereichTable(
                documentInput,
                { vehicleContext },
              )
            : await teilegutachtenExtractionService.extractFromDocument(
              documentInput,
              { vehicleContext },
            );
    return {
      teilegutachten,
      rawText: "",
      ocrJson: buildStubOcrPayload(documentInput.contentType),
      modelId: LLM_VISION_PARSE_MODEL_ID,
    };
  };

  if (
    scope === "full" &&
    isPdfDocumentInput(documentInput) &&
    isAzureMarkdownLayoutAvailable()
  ) {
    try {
      const { markdown, ocrJson } =
        await extractGutachtenMarkdownFromAzure(documentInput);
      const teilegutachten =
        await teilegutachtenExtractionService.extractTeilegutachten(
          markdown,
          { vehicleContext },
        );
      console.info(
        `[analyzeDocument] hybrid teilegutachten: ${ocrJson.pageCount} page(s), ${markdown.length} chars`,
      );
      return {
        teilegutachten,
        rawText: markdown,
        ocrJson,
        modelId: HYBRID_INVOICE_MODEL_ID,
      };
    } catch (hybridError) {
      console.warn(
        "[analyzeDocument] hybrid teilegutachten failed, falling back to vision",
        hybridError,
      );
    }
  }

  return runVision();
}

/**
 * Unified Gutachten cover scan — vision LLM for fields, Azure layout for rawText
 * so §19 Abs. 2 vs Teilegutachten can be disambiguated server-side.
 */
async function analyzeGutachtenDocument(
  documentInput: DocumentBytesInput,
): Promise<{
  gutachten: Awaited<
    ReturnType<typeof gutachtenExtractionService.extractFromDocument>
  >;
  rawText: string;
  ocrJson: OcrJsonPayload;
  modelId: string;
}> {
  let rawText = "";
  let ocrJson = buildStubOcrPayload(documentInput.contentType);
  let modelId = LLM_VISION_PARSE_MODEL_ID;

  if (isAzureMarkdownLayoutAvailable()) {
    try {
      const azure = await extractGutachtenMarkdownFromAzure(documentInput);
      rawText = azure.markdown;
      ocrJson = azure.ocrJson;
      modelId = HYBRID_INVOICE_MODEL_ID;
      console.info(
        `[analyzeDocument] gutachten rawText: ${ocrJson.pageCount} page(s), ${rawText.length} chars`,
      );
    } catch (hybridError) {
      console.warn(
        "[analyzeDocument] gutachten Azure layout failed, vision-only",
        hybridError,
      );
    }
  }

  const gutachtenRaw =
    await gutachtenExtractionService.extractFromDocument(documentInput);
  const fields = normalizeTextParseResult(
    gutachtenToAnalyzeFields(gutachtenRaw),
  );
  const gutachten = resolveGutachtenExtractionSubtype(
    gutachtenRaw,
    fields,
    rawText,
  );

  return { gutachten, rawText, ocrJson, modelId };
}

async function analyzeEinzelabnahmeDocument(
  documentInput: DocumentBytesInput,
  garageVin: string | null,
): Promise<{
  paragraph21: Awaited<
    ReturnType<typeof paragraph21ExtractionService.extractFromDocument>
  >;
  rawText: string;
  ocrJson: OcrJsonPayload;
  modelId: string;
}> {
  const runVision = async () => {
    const paragraph21 =
      await paragraph21ExtractionService.extractFromDocument(documentInput, {
        garageVin,
      });
    return {
      paragraph21,
      rawText: "",
      ocrJson: buildStubOcrPayload(documentInput.contentType),
      modelId: LLM_VISION_PARSE_MODEL_ID,
    };
  };

  if (isPdfDocumentInput(documentInput) && isAzureMarkdownLayoutAvailable()) {
    try {
      const { markdown, ocrJson } =
        await extractGutachtenMarkdownFromAzure(documentInput);
      const paragraph21 =
        await paragraph21ExtractionService.extractParagraph21(markdown, {
          garageVin,
        });
      console.info(
        `[analyzeDocument] hybrid einzelabnahme: ${ocrJson.pageCount} page(s), ${markdown.length} chars`,
      );
      return {
        paragraph21,
        rawText: markdown,
        ocrJson,
        modelId: HYBRID_INVOICE_MODEL_ID,
      };
    } catch (hybridError) {
      console.warn(
        "[analyzeDocument] hybrid einzelabnahme failed, falling back to vision",
        hybridError,
      );
    }
  }

  return runVision();
}

async function analyzePruefung192Document(
  documentInput: DocumentBytesInput,
  garageVin: string | null,
  scope: "bericht" | "gutachten" | "vorschriften" | "full" = "full",
): Promise<{
  paragraph192: Awaited<
    ReturnType<typeof paragraph192ExtractionService.extractFromDocument>
  >;
  rawText: string;
  ocrJson: OcrJsonPayload;
  modelId: string;
}> {
  const runVision = async () => {
    const paragraph192 =
      scope === "bericht"
        ? await paragraph192ExtractionService.extractBerichtPage(documentInput, {
            garageVin,
          })
        : scope === "gutachten"
          ? await paragraph192ExtractionService.extractGutachtenField22(
              documentInput,
              { garageVin },
            )
          : scope === "vorschriften"
            ? await paragraph192ExtractionService.extractVorschriftenPage(
                documentInput,
                { garageVin },
              )
            : await paragraph192ExtractionService.extractFromDocument(
                documentInput,
                { garageVin },
              );
    return {
      paragraph192,
      rawText: "",
      ocrJson: buildStubOcrPayload(documentInput.contentType),
      modelId: LLM_VISION_PARSE_MODEL_ID,
    };
  };

  return runVision();
}

async function analyzeAbeMinimalDocument(
  documentInput: DocumentBytesInput,
  vehicleContext: AbeVehicleContext | null,
): Promise<{
  abe: Awaited<ReturnType<typeof abeExtractionService.extractFromDocument>>;
  rawText: string;
  ocrJson: OcrJsonPayload;
  modelId: string;
}> {
  const runVision = async () => {
    const abe = await abeExtractionService.extractFromDocument(documentInput, {
      vehicleContext,
    });
    return {
      abe,
      rawText: "",
      ocrJson: buildStubOcrPayload(documentInput.contentType),
      modelId: LLM_VISION_PARSE_MODEL_ID,
    };
  };

  if (isPdfDocumentInput(documentInput) && isAzureMarkdownLayoutAvailable()) {
    try {
      const { markdown, ocrJson } =
        await extractGutachtenMarkdownFromAzure(documentInput);
      const abe = await abeExtractionService.extractFromText(markdown, {
        vehicleContext,
      });
      console.info(
        `[analyzeDocument] hybrid abe: ${ocrJson.pageCount} page(s), ${markdown.length} chars`,
      );
      return {
        abe,
        rawText: markdown,
        ocrJson,
        modelId: HYBRID_INVOICE_MODEL_ID,
      };
    } catch (hybridError) {
      console.warn(
        "[analyzeDocument] hybrid abe failed, falling back to vision",
        hybridError,
      );
    }
  }

  return runVision();
}

function buildOcrPayloadFromMarkdown(
  markdown: string,
  pageCount: number,
): OcrJsonPayload {
  const headerLines = markdown
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 12);

  return {
    modelId: "azure-prebuilt-layout",
    locale: "de-DE",
    pageCount: Math.max(1, pageCount),
    text: markdown,
    coverText: markdown.slice(0, 4_000),
    headerLines,
    contentFormat: "markdown",
  };
}

async function analyzeInvoiceOneShot(input: {
  bytes: Buffer;
  contentType: string;
  parseModel: string;
  lockedCategory?: InvoiceTextParseCategory | null;
}): Promise<AnalyzeDocumentResult> {
  const documentInput = {
    bytes: input.bytes,
    contentType: input.contentType,
  };

  // PDFs contain multiple pages. The vision path rasterises only page 1 and
  // can miss a complete Ges.-Preis column that only appears fully on page 2.
  // The hybrid path feeds all pages (after deduplication) as markdown, so the
  // LLM always sees the most complete table.
  //
  // Images (camera scans) are single-frame — the vision path with Azure row
  // guides / Z-markers anchors each row precisely and works best.
  const isPdf = isPdfBuffer(input.bytes) || input.contentType === "application/pdf";
  const canHybrid = isAzureDocumentIntelligenceConfigured();

  const runHybrid = async (): Promise<AnalyzeDocumentResult> => {
    const [hybrid, visionVendor] = await Promise.all([
      hybridInvoiceService.extract(documentInput),
      extractVendorFromLogoHeader(documentInput),
    ]);
    const ocrJson = buildOcrPayloadFromMarkdown(hybrid.markdown, hybrid.pageCount);
    const fields = mapParsedInvoiceToTextParseResult(hybrid.invoice, {
      rawMarkdown: hybrid.markdown,
      lockedCategory: input.lockedCategory,
      visionVendor,
    });
    console.info(
      `[analyzeDocument] hybrid invoice: pages=${hybrid.pageCount} tables=${hybrid.tableCount} positions=${fields.lineItems?.length ?? 0}`,
    );
    return {
      kind: "invoice",
      documentType: "invoice",
      fields,
      approvalFields: null,
      rawText: hybrid.markdown,
      ocrJson,
      modelId: HYBRID_INVOICE_MODEL_ID,
      parseModel: input.parseModel,
    };
  };

  const runVision = async (): Promise<AnalyzeDocumentResult> => {
    const [{ fields, ocrJson }, visionVendor] = await Promise.all([
      invoiceParseService.parseFromDocument(documentInput, {
        model: input.parseModel,
        documentType: "invoice",
      }),
      extractVendorFromLogoHeader(documentInput),
    ]);

    const withVendor = mergeVisionVendorIntoInvoiceFields(
      fields,
      ocrJson,
      visionVendor,
    );

    const fullText = `${ocrJson.headerLines.join("\n")}\n${ocrJson.text}`.trim();
    const category =
      input.lockedCategory != null
        ? input.lockedCategory
        : preferInvoiceCategory(
            withVendor.category,
            fullText,
            ocrJson.headerLines,
          );

    const finalFields = { ...withVendor, category };

    console.info(
      `[analyzeDocument] vision invoice (row guides): positions=${finalFields.lineItems?.length ?? 0} category=${finalFields.category}${visionVendor ? " logoVendor" : ""}`,
    );
    return {
      kind: "invoice",
      documentType: "invoice",
      fields: finalFields,
      approvalFields: null,
      rawText: ocrJson.text,
      ocrJson,
      modelId: LLM_VISION_PARSE_MODEL_ID,
      parseModel: input.parseModel,
    };
  };

  if (isPdf && canHybrid) {
    // PDF: hybrid first (all pages, deduplication), vision as fallback.
    try {
      return await runHybrid();
    } catch (hybridError) {
      console.warn("[analyzeDocument] hybrid failed for PDF, falling back to vision", hybridError);
    }
    return runVision();
  }

  // Image: vision first (row guides anchor each row), hybrid as fallback.
  try {
    return await runVision();
  } catch (visionError) {
    console.warn("[analyzeDocument] vision failed, trying hybrid layout+text", visionError);
  }

  if (canHybrid) {
    try {
      return await runHybrid();
    } catch (error) {
      console.error("[analyzeDocument] hybrid fallback also failed", error);
      throw error;
    }
  }

  throw new TextParseError(
    "Invoice parse failed: vision unavailable and Azure Layout is not configured for hybrid fallback.",
  );
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

function resolveDocumentType(input: {
  documentType?: OcrDocumentType;
  kind?: DocumentParseKind;
}): OcrDocumentType {
  if (input.documentType) return input.documentType;
  const kind = input.kind ?? "auto";
  return documentTypeFromParseKind(
    kind === "abe" ? "abe" : kind === "invoice" ? "invoice" : "auto",
    "other",
  );
}

/**
 * Vision LLM → domain parse service with dynamic model routing.
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
  /** Locked invoice category from scan picker (repair/service/tuning). */
  invoiceCategory?: InvoiceTextParseCategory | null;
  /** Teilegutachten wizard: analyze cover page only vs full document. */
  teilegutachtenScope?: "cover" | "marking" | "verwendungsbereich" | "full";
  /** §19(2) Prüfung wizard — scoped page extraction. */
  pruefung192Scope?: "bericht" | "gutachten" | "vorschriften" | "full";
}): Promise<AnalyzeDocumentResult> {
  if (!isLlmConfigured()) {
    throw new DocumentIntelligenceError(
      "Dokumentanalyse ist nicht vollständig konfiguriert.",
    );
  }

  const documentType = resolveDocumentType({
    documentType: input.documentType,
    kind: input.kind,
  });
  const preferredApprovalKind = input.approvalKind ?? null;
  const vehicleContext = input.vehicleContext ?? null;
  const documentInput = normalizeDocumentInput(input);
  const abeParseModel = resolveAbeContextModel();

  try {
    if (documentType === "abe") {
      if (preferredApprovalKind === "gutachten") {
        const { gutachten, rawText, ocrJson, modelId } =
          await analyzeGutachtenDocument(documentInput);
        return {
          kind: "abe",
          documentType,
          fields: normalizeTextParseResult(gutachtenToAnalyzeFields(gutachten)),
          approvalFields: gutachtenToApprovalFields(gutachten),
          rawText,
          ocrJson,
          modelId,
          parseModel: abeParseModel,
        };
      }

      if (preferredApprovalKind === "einzelabnahme") {
        const { paragraph21, rawText, ocrJson, modelId } =
          await analyzeEinzelabnahmeDocument(
            documentInput,
            input.garageVin ?? null,
          );
        return {
          kind: "abe",
          documentType,
          fields: paragraph21ToAnalyzeFields(
            paragraph21,
            paragraph21.vinMatchesGarage,
          ),
          approvalFields: paragraph21ToApprovalFields(paragraph21),
          rawText,
          ocrJson,
          modelId,
          parseModel: abeParseModel,
        };
      }

      if (preferredApprovalKind === "teilegutachten") {
        const scope = input.teilegutachtenScope ?? "full";
        const { teilegutachten, rawText, ocrJson, modelId } =
          await analyzeTeilegutachtenDocument(
            documentInput,
            vehicleContext,
            scope,
          );
        return {
          kind: "abe",
          documentType,
          fields: teilegutachtenToAnalyzeFields(teilegutachten),
          approvalFields: teilegutachtenToApprovalFields(teilegutachten),
          rawText,
          ocrJson,
          modelId,
          parseModel: abeParseModel,
        };
      }

      if (preferredApprovalKind === "pruefung192") {
        const scope = input.pruefung192Scope ?? "full";
        const { paragraph192, rawText, ocrJson, modelId } =
          await analyzePruefung192Document(
            documentInput,
            input.garageVin ?? null,
            scope,
          );
        return {
          kind: "abe",
          documentType,
          fields: paragraph192ToAnalyzeFields(
            paragraph192,
            paragraph192.vinMatchesGarage,
          ),
          approvalFields: paragraph192ToApprovalFields(paragraph192),
          rawText,
          ocrJson,
          modelId,
          parseModel: abeParseModel,
        };
      }

      if (preferredApprovalKind === "egbe") {
        const { abe, rawText, ocrJson, modelId } =
          await analyzeAbeMinimalDocument(documentInput, vehicleContext);
        const egbe = await egbeExtractionService.extractFromDocument(
          documentInput,
        );
        return {
          kind: "abe",
          documentType,
          fields: abeMinimalToAnalyzeFields(abe),
          approvalFields: { kind: "egbe", data: egbe },
          rawText,
          ocrJson,
          modelId,
          parseModel: abeParseModel,
        };
      }

      const { abe, rawText, ocrJson, modelId } =
        await analyzeAbeMinimalDocument(documentInput, vehicleContext);
      return {
        kind: "abe",
        documentType,
        fields: abeMinimalToAnalyzeFields(abe),
        approvalFields: { kind: "abe" },
        rawText,
        ocrJson,
        modelId,
        parseModel: abeParseModel,
      };
    }

    const resolvedType: OcrDocumentType =
      input.documentType === "tuev" || preferredApprovalKind === "tuev"
        ? "tuev"
        : "invoice";
    const parseModel =
      resolvedType === "invoice"
        ? resolveInvoiceParseModel()
        : resolveParseModel(resolvedType);

    if (resolvedType === "tuev") {
      const { analyzeLayoutWithAzure, buildOcrPayloadFromAzureLayout, isAzureDocumentIntelligenceConfigured } =
        await import("@/lib/ocr/azure-document-intelligence");

      const [tuevVision, azureLayout] = await Promise.all([
        tuevExtractionService.extractFromDocument(documentInput, {
          model: parseModel,
        }),
        isAzureDocumentIntelligenceConfigured()
          ? analyzeLayoutWithAzure(documentInput.bytes, documentInput.contentType)
          : Promise.resolve(null),
      ]);

      const resolvedOcrJson = azureLayout
        ? buildOcrPayloadFromAzureLayout(azureLayout)
        : buildStubOcrPayload(documentInput.contentType);

      return {
        kind: "invoice",
        documentType: "tuev",
        fields: tuevVisionToAnalyzeFields(tuevVision),
        approvalFields: { kind: "tuev", data: tuevVision.report },
        rawText: resolvedOcrJson.text,
        ocrJson: resolvedOcrJson,
        modelId: LLM_VISION_PARSE_MODEL_ID,
        parseModel,
      };
    }

    return analyzeInvoiceOneShot({
      bytes: input.bytes,
      contentType: input.contentType,
      parseModel,
      lockedCategory: input.invoiceCategory ?? null,
    });
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
