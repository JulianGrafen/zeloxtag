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

import { isPdfBuffer } from "./document-bytes";
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
import { mapParsedInvoiceToTextParseResult } from "@/services/invoice/map-parsed-invoice-to-text-parse";
import {
  abeExtractionService,
  resolveAbeContextModel,
} from "@/services/ocr/AbeExtractionService";
import { egbeExtractionService } from "@/services/ocr/EgbeExtractionService";
import { paragraph21ExtractionService } from "@/services/ocr/Paragraph21ExtractionService";
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
  teilegutachtenToAnalyzeFields,
  teilegutachtenToApprovalFields,
} from "@/lib/validations/teilegutachtenSchema";

export type { DocumentParseKind, OcrDocumentType, OcrJsonPayload } from "./ocr-types";

export class DocumentIntelligenceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DocumentIntelligenceError";
  }
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
    const hybrid = await hybridInvoiceService.extract(documentInput);
    const ocrJson = buildOcrPayloadFromMarkdown(hybrid.markdown, hybrid.pageCount);
    const fields = mapParsedInvoiceToTextParseResult(hybrid.invoice, {
      rawMarkdown: hybrid.markdown,
      lockedCategory: input.lockedCategory,
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
    const { fields, ocrJson } = await invoiceParseService.parseFromDocument(
      documentInput,
      { model: input.parseModel, documentType: "invoice" },
    );
    const withCategory =
      input.lockedCategory != null
        ? { ...fields, category: input.lockedCategory }
        : fields;
    console.info(
      `[analyzeDocument] vision invoice (row guides): positions=${withCategory.lineItems?.length ?? 0}`,
    );
    return {
      kind: "invoice",
      documentType: "invoice",
      fields: withCategory,
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
  const documentInput = {
    bytes: input.bytes,
    contentType: input.contentType,
  };
  const ocrPayload = buildStubOcrPayload(input.contentType);

  try {
    if (documentType === "abe") {
      if (preferredApprovalKind === "einzelabnahme") {
        const paragraph21 =
          await paragraph21ExtractionService.extractFromDocument(documentInput, {
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
          rawText: "",
          ocrJson: ocrPayload,
          modelId: LLM_VISION_PARSE_MODEL_ID,
          parseModel: resolveAbeContextModel(),
        };
      }

      if (preferredApprovalKind === "teilegutachten") {
        const teilegutachten =
          await teilegutachtenExtractionService.extractFromDocument(
            documentInput,
            { vehicleContext },
          );
        return {
          kind: "abe",
          documentType,
          fields: teilegutachtenToAnalyzeFields(teilegutachten),
          approvalFields: teilegutachtenToApprovalFields(teilegutachten),
          rawText: "",
          ocrJson: ocrPayload,
          modelId: LLM_VISION_PARSE_MODEL_ID,
          parseModel: resolveAbeContextModel(),
        };
      }

      if (preferredApprovalKind === "egbe") {
        const [abe, egbe] = await Promise.all([
          abeExtractionService.extractFromDocument(documentInput, {
            vehicleContext,
          }),
          egbeExtractionService.extractFromDocument(documentInput),
        ]);
        return {
          kind: "abe",
          documentType,
          fields: abeMinimalToAnalyzeFields(abe),
          approvalFields: { kind: "egbe", data: egbe },
          rawText: "",
          ocrJson: ocrPayload,
          modelId: LLM_VISION_PARSE_MODEL_ID,
          parseModel: resolveAbeContextModel(),
        };
      }

      const abe = await abeExtractionService.extractFromDocument(documentInput, {
        vehicleContext,
      });
      return {
        kind: "abe",
        documentType,
        fields: abeMinimalToAnalyzeFields(abe),
        approvalFields: { kind: "abe" },
        rawText: "",
        ocrJson: ocrPayload,
        modelId: LLM_VISION_PARSE_MODEL_ID,
        parseModel: resolveAbeContextModel(),
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
        : ocrPayload;

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
