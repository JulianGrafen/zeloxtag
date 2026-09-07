import { NextResponse, type NextRequest } from "next/server";

import { isLlmConfigured } from "@/lib/ocr/llm-client";
import {
  enforceRateLimit,
  enforceSameOrigin,
  requireWritableApiUser,
} from "@/lib/security/api-guard";
import { withScanSessionId } from "@/lib/billing/free-scan-quota";
import { FEATURE } from "@/lib/permissions/feature-access";
import { ocrAccessFromFormData } from "@/lib/security/require-vehicle-ocr";
import { validateDocumentUpload } from "@/lib/security/file-upload";
import {
  automotiveGateErrorFromCaught,
  enforceAutomotiveGateFromFormData,
} from "@/lib/ocr/ocr-automotive-gate";
import { AUTOMOTIVE_REJECTION_CODE } from "@/lib/ocr/verify-automotive-context";
import { logServerError } from "@/lib/security/public-error";
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
    | "rate_limited"
    | typeof AUTOMOTIVE_REJECTION_CODE;
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

    const auth = await requireWritableApiUser();
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

    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return jsonError(400, "Document file is required.", "bad_request");
    }

    const fileCheck = await validateDocumentUpload(file, { maxBytes: MAX_BYTES });
    if (!fileCheck.ok) {
      return jsonError(400, fileCheck.error, "bad_request");
    }

    const gateBlocked = await enforceAutomotiveGateFromFormData(formData, fileCheck);
    if (gateBlocked) return gateBlocked;

    const vehicleAccess = await ocrAccessFromFormData(
      formData,
      auth.user.id,
      FEATURE.SCAN_AI_RECEIPT,
    );
    if (!vehicleAccess.ok) return vehicleAccess.response;

    const bytes = Buffer.from(fileCheck.bytes);
    const sniffed = fileCheck.mime;

    // Single vision-LLM call on the full document (PDF/image as-is).
    const extraction = await tuevExtractionService.extractFromDocument({
      bytes,
      contentType: sniffed,
    });

    const body: SingleSuccess = { ok: true, extraction };
    return NextResponse.json(
      withScanSessionId(body, vehicleAccess.scanSessionId),
    );
  } catch (error) {
    const gateResponse = automotiveGateErrorFromCaught(error);
    if (gateResponse) return gateResponse;

    logServerError("[api/ocr/tuev/single] extraction failed", error);
    return jsonError(
      500,
      "TÜV-Auswertung fehlgeschlagen. Bitte erneut versuchen.",
      "extract_failed",
    );
  }
}
