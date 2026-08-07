import { NextResponse, type NextRequest } from "next/server";

import { isLlmConfigured } from "@/lib/ocr/llm-client";
import {
  enforceRateLimit,
  enforceSameOrigin,
  requireApiUser,
} from "@/lib/security/api-guard";
import { sniffAllowedMime } from "@/lib/security/file-upload";
import { preprocessTuevDocument } from "@/services/documents/PdfPreprocessor";
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
 * Automatically pre-processes the document (PDF or image) and runs
 * focused step-based LLM extraction for maximum accuracy.
 *
 * For multi-page PDFs: header + defects are extracted in parallel.
 * For single-page / images: runs full extraction on the one page.
 *
 * FormData: { file: File }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const originBlocked = enforceSameOrigin(request);
    if (originBlocked) return originBlocked;

    // Use the "ocr" bucket — single upload is two LLM calls (≈ twice the cost).
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
    if (!sniffed) {
      return jsonError(
        400,
        "Unsupported or spoofed file type (PDF/JPEG/PNG/WebP/HEIC required).",
        "bad_request",
      );
    }

    // Pre-process: split into focused page buffers.
    const preprocessed = await preprocessTuevDocument(bytes, sniffed);

    // Extract — parallel for multi-page, single call for one-pagers.
    const extraction =
      await tuevExtractionService.extractFromPreprocessedDocument(preprocessed);

    const body: SingleSuccess = { ok: true, extraction };
    return NextResponse.json(body);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected extraction error.";
    console.error("[tuev/single] extraction failed:", message);
    return jsonError(500, message, "extract_failed");
  }
}
