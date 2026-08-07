import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import {
  analyzeDocument,
  DocumentIntelligenceError,
} from "@/lib/ocr/document-intelligence";
import { isLlmConfigured } from "@/lib/ocr/llm-client";
import { resolveParseModel } from "@/lib/ocr/model-routing";
import { OCR_DOCUMENT_TYPES, type OcrDocumentType } from "@/lib/ocr/ocr-types";
import type { ApprovalFields } from "@/lib/documents/approval-fields";
import {
  APPROVAL_FIELD_KINDS,
  parseApprovalFields,
} from "@/lib/documents/approval-fields";
import {
  invoiceTextParseSchema,
  type InvoiceTextParseResult,
} from "@/lib/ocr/text-parse-schema";
import {
  enforceRateLimit,
  enforceSameOrigin,
  requireApiUser,
} from "@/lib/security/api-guard";
import { sniffAllowedMime } from "@/lib/security/file-upload";
import { AbeVehicleContextSchema } from "@/lib/validations/abeSchema";

export const runtime = "nodejs";
export const maxDuration = 60;

/** High-fidelity invoice photos / multi-page PDFs. */
const MAX_BYTES = 25 * 1024 * 1024;

const documentTypeSchema = z.enum(OCR_DOCUMENT_TYPES);
const approvalKindSchema = z.enum(APPROVAL_FIELD_KINDS);

type ParseSuccess = {
  ok: true;
  documentType: OcrDocumentType;
  parseModel: string;
  contentFormat: "markdown" | "text";
  fields: InvoiceTextParseResult;
  approvalFields: ApprovalFields | null;
  rawText: string;
  modelId: string;
};

type ParseError = {
  ok: false;
  error: string;
  code:
    | "unauthorized"
    | "bad_request"
    | "config"
    | "azure_unreachable"
    | "parse_failed"
    | "rate_limited";
};

function jsonError(
  status: number,
  error: string,
  code: ParseError["code"],
) {
  const body: ParseError = { ok: false, error, code };
  return NextResponse.json(body, { status });
}

/**
 * POST /api/ocr/parse
 *
 * ZeloxTag document parse pipeline:
 * 1) Vision LLM on PDF/image bytes (no Azure OCR)
 * 2) Dynamic model routing by `documentType` (invoice vs abe/tuev)
 * 3) Domain parse service + Zod validation before response
 */
export async function POST(request: NextRequest) {
  try {
    const originBlocked = enforceSameOrigin(request);
    if (originBlocked) return originBlocked;
    const limited = await enforceRateLimit(request, "ocr", "parse");
    if (limited) return limited;

    const auth = await requireApiUser();
    if (!auth.ok) return auth.response;

    if (!isLlmConfigured()) {
      return jsonError(
        503,
        "Dokumentanalyse ist nicht vollständig konfiguriert.",
        "config",
      );
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return jsonError(400, "Expected multipart form data.", "bad_request");
    }

    const documentTypeRaw = String(formData.get("documentType") ?? "").trim();
    const documentTypeParsed = documentTypeSchema.safeParse(documentTypeRaw);
    if (!documentTypeParsed.success) {
      return jsonError(
        400,
        `documentType is required (one of: ${OCR_DOCUMENT_TYPES.join(", ")}).`,
        "bad_request",
      );
    }
    const documentType = documentTypeParsed.data;

    const approvalKindRaw = String(formData.get("approvalKind") ?? "").trim();
    const approvalKindParsed = approvalKindRaw
      ? approvalKindSchema.safeParse(approvalKindRaw)
      : null;
    if (approvalKindRaw && !approvalKindParsed?.success) {
      return jsonError(
        400,
        `approvalKind must be one of: ${APPROVAL_FIELD_KINDS.join(", ")}.`,
        "bad_request",
      );
    }
    const approvalKind = approvalKindParsed?.success
      ? approvalKindParsed.data
      : null;

    const vehicleContextRaw = String(formData.get("vehicleContext") ?? "").trim();
    let vehicleContext: z.infer<typeof AbeVehicleContextSchema> | null = null;
    if (vehicleContextRaw) {
      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(vehicleContextRaw);
      } catch {
        return jsonError(
          400,
          "vehicleContext must be valid JSON.",
          "bad_request",
        );
      }
      const vehicleParsed = AbeVehicleContextSchema.safeParse(parsedJson);
      if (!vehicleParsed.success) {
        return jsonError(
          400,
          "vehicleContext invalid (expected { brand, model, type?, egBe? }).",
          "bad_request",
        );
      }
      vehicleContext = vehicleParsed.data;
    }

    const garageVinRaw = String(formData.get("garageVin") ?? "").trim();
    const garageVin = garageVinRaw.length > 0 ? garageVinRaw.slice(0, 32) : null;

    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return jsonError(400, "Document file is required.", "bad_request");
    }

    if (file.size > MAX_BYTES) {
      return jsonError(
        400,
        `Datei zu groß (max. ${Math.round(MAX_BYTES / (1024 * 1024))} MB).`,
        "bad_request",
      );
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const sniffed = sniffAllowedMime(bytes);
    const contentType = sniffed ?? file.type;
    if (!sniffed) {
      return jsonError(
        400,
        "Unsupported or spoofed file type (PDF/JPEG/PNG/WebP/HEIC required).",
        "bad_request",
      );
    }

    const result = await analyzeDocument({
      bytes,
      contentType,
      documentType,
      approvalKind,
      vehicleContext,
      garageVin,
      kind: documentType === "abe" ? "abe" : "invoice",
    });

    // Defense in depth: re-validate LLM-shaped fields before responding.
    const validated = invoiceTextParseSchema.safeParse(result.fields);
    if (!validated.success) {
      return jsonError(
        422,
        "LLM output failed Zod schema validation.",
        "parse_failed",
      );
    }

    const body: ParseSuccess = {
      ok: true,
      documentType: result.documentType,
      parseModel: result.parseModel || resolveParseModel(documentType),
      contentFormat: result.ocrJson.contentFormat,
      fields: validated.data,
      approvalFields: parseApprovalFields(result.approvalFields),
      rawText: result.rawText,
      modelId: result.modelId,
    };
    return NextResponse.json(body);
  } catch (error) {
    if (error instanceof DocumentIntelligenceError) {
      return jsonError(502, error.message, "parse_failed");
    }

    const message =
      error instanceof Error ? error.message : "Unexpected OCR parse error.";
    return jsonError(500, message, "parse_failed");
  }
}
