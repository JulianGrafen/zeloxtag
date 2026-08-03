import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import {
  extractInvoiceFromText,
  TextParseError,
} from "@/lib/ocr/extract-from-text";
import { isLlmConfigured } from "@/lib/ocr/llm-client";
import type { InvoiceTextParseResult } from "@/lib/ocr/text-parse-schema";
import { enforceRateLimit } from "@/lib/security/api-guard";
import { parseStrictBody, readJsonBody } from "@/lib/security/parse-body";

export const runtime = "nodejs";

const MAX_RAW_TEXT_CHARS = 12_000;

const requestSchema = z
  .object({
    rawText: z.string().trim().min(8).max(MAX_RAW_TEXT_CHARS),
  })
  .strict();

type ParseTextSuccess = {
  ok: true;
  fields: InvoiceTextParseResult;
};

type ParseTextError = {
  ok: false;
  error: string;
  code:
    | "unauthorized"
    | "bad_request"
    | "config"
    | "parse_failed"
    | "rate_limited";
};

function jsonError(
  status: number,
  error: string,
  code: ParseTextError["code"],
) {
  const body: ParseTextError = { ok: false, error, code };
  return NextResponse.json(body, { status });
}

/**
 * POST /api/ocr/parse-text
 * Hybrid OCR step 2: structured extraction from client Tesseract text.
 * Public for QR scan UX (rate-limited); keys stay server-side.
 */
export async function POST(request: NextRequest) {
  try {
    const limited = enforceRateLimit(request, "ocr", "parse-text");
    if (limited) return limited;

    if (!isLlmConfigured()) {
      return jsonError(
        503,
        "LLM API key fehlt. In .env setzen: API_KEY (Foundry) — DOCUMENTINTELLIGENCE_API_KEY reicht nur für OCR.",
        "config",
      );
    }

    const bodyRead = await readJsonBody(request);
    if (!bodyRead.ok) {
      return jsonError(400, bodyRead.error, "bad_request");
    }

    const parsedBody = parseStrictBody(requestSchema, bodyRead.json);
    if (!parsedBody.ok) {
      return jsonError(
        400,
        "rawText is required (min 8 characters).",
        "bad_request",
      );
    }

    let fields: InvoiceTextParseResult;
    try {
      fields = await extractInvoiceFromText(parsedBody.data.rawText);
    } catch (error) {
      const message =
        error instanceof TextParseError
          ? error.message
          : "Failed to parse invoice text.";
      return jsonError(422, message, "parse_failed");
    }

    const body: ParseTextSuccess = { ok: true, fields };
    return NextResponse.json(body, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected parse-text error.";
    return jsonError(500, message, "parse_failed");
  }
}
