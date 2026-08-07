/**
 * Document parse dispatch — vision LLM for most types.
 * TÜV uses a hybrid: Azure DI OCR text for KM-Stand + Punkt-6 Mängel heuristics,
 * vision LLM for costs, dates, and metadata.
 */

import type {
  ApprovalFieldKind,
  ApprovalFields,
} from "@/lib/documents/approval-fields";

import {
  buildFullOcrPlainText,
  runTuevDocumentOcr,
} from "./azure-document-ocr";
import { isLlmConfigured } from "./llm-client";
import { mergeTuevHybridReport } from "./tuev-hybrid-merge";
import {
  buildStubOcrPayload,
  LLM_VISION_PARSE_MODEL_ID,
} from "./llm-document-content";
import { documentTypeFromParseKind, resolveParseModel } from "./model-routing";
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
  resolveAbeContextModel,
} from "@/services/ocr/AbeExtractionService";
import { egbeExtractionService } from "@/services/ocr/EgbeExtractionService";
import { paragraph21ExtractionService } from "@/services/ocr/Paragraph21ExtractionService";
import { teilegutachtenExtractionService } from "@/services/ocr/TeilegutachtenExtractionService";
import { tuevExtractionService } from "@/services/ocr/TuevExtractionService";
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
  /** Parse source id returned to clients (`llm-vision`). */
  modelId: string;
  /** Chat deployment used for structured parse. */
  parseModel: string;
};

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
  const ocrPayload = buildStubOcrPayload(input.contentType);
  const documentInput = {
    bytes: input.bytes,
    contentType: input.contentType,
  };

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
          parseModel: vehicleContext
            ? resolveAbeContextModel()
            : resolveParseModel("abe"),
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
        parseModel: vehicleContext
          ? resolveAbeContextModel()
          : resolveParseModel("abe"),
      };
    }

    const resolvedType: OcrDocumentType =
      input.documentType === "tuev" || preferredApprovalKind === "tuev"
        ? "tuev"
        : "invoice";
    const parseModel = resolveParseModel(resolvedType);

    if (resolvedType === "tuev") {
      const [fields, tuevReport, ocrPayloadResult] = await Promise.all([
        invoiceParseService.parseFromDocument(documentInput, {
          model: parseModel,
          documentType: "tuev",
        }),
        tuevExtractionService.extractFromDocument(documentInput, {
          model: parseModel,
        }),
        runTuevDocumentOcr(documentInput),
      ]);

      const ocrText = ocrPayloadResult
        ? buildFullOcrPlainText(ocrPayloadResult)
        : "";
      const mergedTuev =
        ocrText.length >= 8
          ? mergeTuevHybridReport(tuevReport, ocrText)
          : tuevReport;

      return {
        kind: "invoice",
        documentType: "tuev",
        fields: {
          ...fields,
          category: "tuev",
          mileageKm: mergedTuev.mileageKm ?? fields.mileageKm ?? null,
        },
        approvalFields: { kind: "tuev", data: mergedTuev },
        rawText: ocrText,
        ocrJson: ocrPayloadResult ?? ocrPayload,
        modelId: ocrPayloadResult?.modelId ?? LLM_VISION_PARSE_MODEL_ID,
        parseModel,
      };
    }

    const fields = await invoiceParseService.parseFromDocument(documentInput, {
      model: parseModel,
      documentType: "invoice",
    });
    return {
      kind: "invoice",
      documentType: "invoice",
      fields,
      approvalFields: null,
      rawText: "",
      ocrJson: ocrPayload,
      modelId: LLM_VISION_PARSE_MODEL_ID,
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
