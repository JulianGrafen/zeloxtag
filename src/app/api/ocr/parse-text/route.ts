import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/get-user";
import {
  extractInvoiceFromText,
  TextParseError,
} from "@/lib/ocr/extract-from-text";
import { isLlmConfigured } from "@/lib/ocr/llm-client";
import type { InvoiceTextParseResult } from "@/lib/ocr/text-parse-schema";
import { getSupabaseEnv } from "@/lib/supabase/env";

export const runtime = "nodejs";

const MAX_RAW_TEXT_CHARS = 12_000;

const requestSchema = z.object({
  rawText: z.string().trim().min(8).max(MAX_RAW_TEXT_CHARS),
});

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
    | "parse_failed";
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
 */
export async function POST(request: NextRequest) {
  try {
    if (!isLlmConfigured()) {
      return jsonError(
        503,
        "LLM API key fehlt. In .env setzen: API_KEY (Foundry) — DOCUMENTINTELLIGENCE_API_KEY reicht nur für OCR.",
        "config",
      );
    }

    const { isConfigured } = getSupabaseEnv();
    if (isConfigured) {
      const user = await getCurrentUser();
      if (!user) {
        return jsonError(401, "Authentication required.", "unauthorized");
      }
    }

    let json: unknown;
    try {
      json = await request.json();
    } catch {
      return jsonError(400, "Expected JSON body.", "bad_request");
    }

    const parsedBody = requestSchema.safeParse(json);
    if (!parsedBody.success) {
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
