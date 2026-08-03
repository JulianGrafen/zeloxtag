import { NextResponse, type NextRequest } from "next/server";

import {
  analyzeInvoiceDocument,
  DocumentIntelligenceError,
} from "@/lib/ocr/document-intelligence";
import { getDocumentIntelligenceEnv } from "@/lib/ocr/document-intelligence-env";
import { isLlmConfigured } from "@/lib/ocr/llm-client";
import type { InvoiceTextParseResult } from "@/lib/ocr/text-parse-schema";

export const runtime = "nodejs";
export const maxDuration = 60;

/** High-fidelity invoice photos / multi-page PDFs (Azure S0 allows far more). */
const MAX_BYTES = 25 * 1024 * 1024;

const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/tiff",
  "image/bmp",
  "image/heic",
  "image/heif",
  "application/octet-stream",
]);

type AnalyzeSuccess = {
  ok: true;
  fields: InvoiceTextParseResult;
  rawText: string;
  modelId: string;
};

type AnalyzeError = {
  ok: false;
  error: string;
  code: "unauthorized" | "bad_request" | "config" | "analyze_failed";
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
 * Cheap path: DI Read OCR → OCR JSON → Foundry field parse (< ~1¢ / page).
 */
export async function POST(request: NextRequest) {
  try {
    const { isConfigured } = getDocumentIntelligenceEnv();
    if (!isConfigured) {
      return jsonError(
        503,
        "Document Intelligence ist nicht konfiguriert (DOCUMENTINTELLIGENCE_ENDPOINT / DOCUMENTINTELLIGENCE_API_KEY).",
        "config",
      );
    }

    if (!isLlmConfigured()) {
      return jsonError(
        503,
        "LLM API key fehlt (API_KEY) — benötigt für OCR-JSON-Parse.",
        "config",
      );
    }

    // No session check: Magic Link auth is deferred; keys stay server-side only.

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

    const contentType = file.type || "application/octet-stream";
    if (!ALLOWED_MIME.has(contentType)) {
      return jsonError(
        400,
        `Unsupported content type: ${contentType}`,
        "bad_request",
      );
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const result = await analyzeInvoiceDocument({ bytes, contentType });

    const body: AnalyzeSuccess = {
      ok: true,
      fields: result.fields,
      rawText: result.rawText,
      modelId: result.modelId,
    };
    return NextResponse.json(body);
  } catch (error) {
    if (error instanceof DocumentIntelligenceError) {
      return jsonError(502, error.message, "analyze_failed");
    }

    const message =
      error instanceof Error ? error.message : "Unexpected analyze error.";
    return jsonError(500, message, "analyze_failed");
  }
}
