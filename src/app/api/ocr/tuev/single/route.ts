import { NextResponse, type NextRequest } from "next/server";

import { isLlmConfigured } from "@/lib/ocr/llm-client";
import {
  enforceRateLimit,
  enforceSameOrigin,
  requireApiUser,
} from "@/lib/security/api-guard";
import { requireVehicleOcrAccess } from "@/lib/security/require-vehicle-ocr";
import { validateDocumentUpload } from "@/lib/security/file-upload";
import {
  tuevExtractionService,
  type TuevVisionExtraction,
} from "@/services/ocr/TuevExtractionService";

export const runtime = "nodejs";
export const maxDuration = 90;

const MAX_BYTES = 25 * 1024 * 1024;

type SingleSuccess = {
  ok: true;
  extraction: TuevVisionExtraction;
};

type SingleError = {
  ok: false;
  error: string;
  code:
    | "unauthorized"
    | "bad_request"
    | "config"
    | "extract_failed"
    | "rate_limited";
};

function jsonError(
  status: number,
  error: string,
  code: SingleError["code"],
): NextResponse<SingleError> {
  return NextResponse.json({ ok: false, error, code }, { status });
}

/**
 * POST /api/ocr/tuev/single
 *
 * One-shot TÜV extraction for the Single-Click Upload experience.
 * Sends the full document directly to the vision LLM in a single call —
 * no OCR, no page splitting, no wizard-style step extraction.
 *
 * FormData: { file: File }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const originBlocked = enforceSameOrigin(request);
    if (originBlocked) return originBlocked;

    // Use the "ocr" bucket — single full-document LLM vision call.
    const limited = await enforceRateLimit(request, "ocr", "tuev-single");
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

    // Single vision-LLM call on the full document (PDF/image as-is).
    const extraction = await tuevExtractionService.extractFromDocument({
      bytes,
      contentType: sniffed,
    });

    const body: SingleSuccess = { ok: true, extraction };
    return NextResponse.json(body);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected extraction error.";
    console.error("[tuev/single] extraction failed:", message);
    return jsonError(500, message, "extract_failed");
  }
}
