import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import {
  analyzeInvoiceDocument,
  DocumentIntelligenceError,
} from "@/lib/ocr/document-intelligence";
import { getDocumentIntelligenceEnv } from "@/lib/ocr/document-intelligence-env";
import { isLlmConfigured } from "@/lib/ocr/llm-client";
import type { InvoiceTextParseResult } from "@/lib/ocr/text-parse-schema";
import { enforceRateLimit } from "@/lib/security/api-guard";

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

const optionalMetaSchema = z
  .object({
    vehicleId: z.string().uuid().optional(),
    tagUuid: z.string().trim().min(1).max(128).optional(),
  })
  .strict();

type AnalyzeSuccess = {
  ok: true;
  fields: InvoiceTextParseResult;
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
 * Cheap path: DI Read OCR → OCR JSON → Foundry field parse.
 * Public for QR scan UX (rate-limited); keys stay server-side.
 */
export async function POST(request: NextRequest) {
  try {
    const limited = enforceRateLimit(request, "upload", "analyze");
    if (limited) return limited;

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

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return jsonError(400, "Expected multipart form data.", "bad_request");
    }

    const vehicleRaw = String(formData.get("vehicleId") ?? "").trim();
    const tagRaw = String(formData.get("tagUuid") ?? "").trim();
    const meta = optionalMetaSchema.safeParse({
      ...(vehicleRaw ? { vehicleId: vehicleRaw } : {}),
      ...(tagRaw ? { tagUuid: tagRaw } : {}),
    });
    if (!meta.success) {
      return jsonError(400, "Invalid optional metadata fields.", "bad_request");
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
