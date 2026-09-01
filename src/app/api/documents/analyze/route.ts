import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import {
  analyzeDocument,
  DocumentIntelligenceError,
} from "@/lib/ocr/document-intelligence";
import { isLlmConfigured } from "@/lib/ocr/llm-client";
import type { DocumentParseKind, OcrDocumentType } from "@/lib/ocr/ocr-types";
import { OCR_DOCUMENT_TYPES } from "@/lib/ocr/ocr-types";
import type { ApprovalFields } from "@/lib/documents/approval-fields";
import { parseApprovalFields } from "@/lib/documents/approval-fields";
import type { InvoiceTextParseResult } from "@/lib/ocr/text-parse-schema";
import {
  enforceRateLimit,
  enforceSameOrigin,
  requireApiUser,
} from "@/lib/security/api-guard";
import { logServerError } from "@/lib/security/public-error";
import { requireVehicleOcrAccess } from "@/lib/security/require-vehicle-ocr";
import { validateDocumentUpload } from "@/lib/security/file-upload";

export const runtime = "nodejs";
export const maxDuration = 60;

/** High-fidelity invoice photos / multi-page PDFs. */
const MAX_BYTES = 25 * 1024 * 1024;

const optionalMetaSchema = z
  .object({
    vehicleId: z.string().uuid(),
    tagUuid: z.string().trim().min(1).max(128).optional(),
    kind: z.enum(["invoice", "abe", "auto"]).optional(),
    documentType: z.enum(OCR_DOCUMENT_TYPES).optional(),
  })
  .strict();

type AnalyzeSuccess = {
  ok: true;
  kind: "invoice" | "abe";
  documentType: OcrDocumentType;
  parseModel: string;
  fields: InvoiceTextParseResult;
  approvalFields: ApprovalFields | null;
  rawText: string;
  modelId: string;
};

type AnalyzeError = {
  ok: false;
  error: string;
  code: "unauthorized" | "bad_request" | "config" | "analyze_failed" | "rate_limited";
};

function jsonError(
  status: number,
  error: string,
  code: AnalyzeError["code"],
) {
  const body: AnalyzeError = { ok: false, error, code };
  return NextResponse.json(body, { status });
}

/**
 * POST /api/documents/analyze
 * Compatibility wrapper around Markdown OCR + routed parse.
 * Prefer `/api/ocr/parse` with explicit `documentType` for new clients.
 */
export async function POST(request: NextRequest) {
  try {
    const originBlocked = enforceSameOrigin(request);
    if (originBlocked) return originBlocked;
    const limited = await enforceRateLimit(request, "upload", "analyze");
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

    const vehicleRaw = String(formData.get("vehicleId") ?? "").trim();
    const tagRaw = String(formData.get("tagUuid") ?? "").trim();
    const kindRaw = String(formData.get("kind") ?? "").trim().toLowerCase();
    const documentTypeRaw = String(formData.get("documentType") ?? "")
      .trim()
      .toLowerCase();
    const meta = optionalMetaSchema.safeParse({
      vehicleId: vehicleRaw,
      ...(tagRaw ? { tagUuid: tagRaw } : {}),
      ...(kindRaw === "invoice" || kindRaw === "abe" || kindRaw === "auto"
        ? { kind: kindRaw }
        : {}),
      ...(documentTypeRaw
        ? { documentType: documentTypeRaw }
        : {}),
    });
    if (!meta.success) {
      return jsonError(400, "vehicleId (UUID) is required.", "bad_request");
    }

    const vehicleAccess = await requireVehicleOcrAccess(
      auth.user.id,
      meta.data.vehicleId,
    );
    if (!vehicleAccess.ok) return vehicleAccess.response;

    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return jsonError(400, "Document file is required.", "bad_request");
    }

    const fileCheck = await validateDocumentUpload(file, { maxBytes: MAX_BYTES });
    if (!fileCheck.ok) {
      return jsonError(400, fileCheck.error, "bad_request");
    }
    const bytes = Buffer.from(fileCheck.bytes);
    const sniffed = fileCheck.mime;

    const kind: DocumentParseKind = meta.data.kind ?? "auto";
    const documentType: OcrDocumentType | undefined = meta.data.documentType;

    const result = await analyzeDocument({
      bytes,
      contentType: sniffed,
      kind,
      documentType,
    });

    const body: AnalyzeSuccess = {
      ok: true,
      kind: result.kind,
      documentType: result.documentType,
      parseModel: result.parseModel,
      fields: result.fields,
      approvalFields: parseApprovalFields(result.approvalFields),
      rawText: result.rawText,
      modelId: result.modelId,
    };
    return NextResponse.json(body);
  } catch (error) {
    if (error instanceof DocumentIntelligenceError) {
      logServerError("[api/documents/analyze] provider failed", error);
      return jsonError(
        502,
        "Dokumentanalyse-Dienst vorübergehend nicht verfügbar.",
        "analyze_failed",
      );
    }

    logServerError("[api/documents/analyze] unexpected", error);
    return jsonError(
      500,
      "Dokumentanalyse fehlgeschlagen. Bitte erneut versuchen.",
      "analyze_failed",
    );
  }
}
