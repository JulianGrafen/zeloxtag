import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import {
  analyzeDocument,
  isDocumentIntelligenceError,
} from "@/lib/ocr/document-intelligence";
import { isTextParseError } from "@/lib/ocr/parse-error";
import { isLlmConfigured } from "@/lib/ocr/llm-client";
import { resolveParseModel, isInvoiceNanoTestMode } from "@/lib/ocr/model-routing";
import { OCR_DOCUMENT_TYPES, type OcrDocumentType } from "@/lib/ocr/ocr-types";
import type { ApprovalFields } from "@/lib/documents/approval-fields";
import {
  APPROVAL_FIELD_KINDS,
  parseApprovalFields,
} from "@/lib/documents/approval-fields";
import {
  INVOICE_TEXT_PARSE_CATEGORIES,
  invoiceTextParseSchema,
  type InvoiceTextParseResult,
} from "@/lib/ocr/text-parse-schema";
import {
  enforceRateLimit,
  enforceSameOrigin,
  requireApiUser,
} from "@/lib/security/api-guard";
import { requireVehicleOcrAccess } from "@/lib/security/require-vehicle-ocr";
import { sniffAllowedMime } from "@/lib/security/file-upload";
import { AbeVehicleContextSchema } from "@/lib/validations/abeSchema";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Stay below Vercel body limit; JPEG pages from client rasterization are smaller than PDFs. */
const MAX_BYTES = 12 * 1024 * 1024;

const documentTypeSchema = z.enum(OCR_DOCUMENT_TYPES);
const approvalKindSchema = z.enum(APPROVAL_FIELD_KINDS);
const invoiceCategorySchema = z.enum(INVOICE_TEXT_PARSE_CATEGORIES);

type ParseSuccess = {
  ok: true;
  documentType: OcrDocumentType;
  parseModel: string;
  invoiceNanoTestMode?: boolean;
  contentFormat: "markdown" | "text";
  fields: InvoiceTextParseResult;
  approvalFields: ApprovalFields | null;
  rawText: string;
  modelId: string;
  /** Invoices: false when the positions do not add up to the printed totals. */
  lineItemsVerified?: boolean;
  /** German review hint when `lineItemsVerified` is false. */
  lineItemsWarning?: string | null;
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
 * 1) Hybrid layout OCR + text LLM for invoices (one shot), vision fallback
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

    const vehicleAccess = await requireVehicleOcrAccess(
      auth.user.id,
      String(formData.get("vehicleId") ?? ""),
    ).catch((error) => {
      console.error("[api/ocr/parse] vehicle access check failed", error);
      return {
        ok: false as const,
        response: jsonError(
          503,
          "Fahrzeugzugriff konnte nicht geprüft werden.",
          "config",
        ),
      };
    });
    if (!vehicleAccess.ok) return vehicleAccess.response;

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

    const invoiceCategoryRaw = String(formData.get("invoiceCategory") ?? "").trim();
    const invoiceCategoryParsed = invoiceCategoryRaw
      ? invoiceCategorySchema.safeParse(invoiceCategoryRaw)
      : null;
    if (invoiceCategoryRaw && !invoiceCategoryParsed?.success) {
      return jsonError(
        400,
        `invoiceCategory must be one of: ${INVOICE_TEXT_PARSE_CATEGORIES.join(", ")}.`,
        "bad_request",
      );
    }
    const invoiceCategory = invoiceCategoryParsed?.success
      ? invoiceCategoryParsed.data
      : null;

    const teilegutachtenScopeRaw = String(
      formData.get("teilegutachtenScope") ?? "",
    ).trim();
    const teilegutachtenScope =
      teilegutachtenScopeRaw === "cover" ||
      teilegutachtenScopeRaw === "marking" ||
      teilegutachtenScopeRaw === "verwendungsbereich" ||
      teilegutachtenScopeRaw === "full"
        ? teilegutachtenScopeRaw
        : undefined;

    const pruefung192ScopeRaw = String(
      formData.get("pruefung192Scope") ?? "",
    ).trim();
    const pruefung192Scope =
      pruefung192ScopeRaw === "bericht" ||
      pruefung192ScopeRaw === "gutachten" ||
      pruefung192ScopeRaw === "vorschriften" ||
      pruefung192ScopeRaw === "full"
        ? pruefung192ScopeRaw
        : undefined;

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
      invoiceCategory,
      kind: documentType === "abe" ? "abe" : "invoice",
      teilegutachtenScope,
      pruefung192Scope,
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
      invoiceNanoTestMode:
        documentType === "invoice" && isInvoiceNanoTestMode()
          ? true
          : undefined,
      contentFormat: result.ocrJson.contentFormat,
      fields: validated.data,
      approvalFields: parseApprovalFields(result.approvalFields),
      rawText: result.rawText,
      modelId: result.modelId,
      lineItemsVerified: result.lineItemsVerified,
      lineItemsWarning: result.lineItemsWarning ?? null,
    };
    return NextResponse.json(body);
  } catch (error) {
    if (isDocumentIntelligenceError(error) || isTextParseError(error)) {
      console.error("[api/ocr/parse] provider failed", error);
      const message =
        error instanceof Error && error.message.trim()
          ? error.message
          : "Dokumentanalyse-Dienst vorübergehend nicht verfügbar.";
      return jsonError(502, message, "parse_failed");
    }

    console.error("[api/ocr/parse] unexpected", error);
    return jsonError(
      500,
      "Dokumentanalyse fehlgeschlagen. Bitte erneut versuchen.",
      "parse_failed",
    );
  }
}
