import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/get-user";
import type { AbeCoreParseResult } from "@/lib/ocr/abe-parse-schema";
import { extractAbeFromText } from "@/lib/ocr/extract-abe-from-text";
import { TextParseError } from "@/lib/ocr/extract-from-text";
import { isLlmConfigured } from "@/lib/ocr/llm-client";
import { getSupabaseEnv } from "@/lib/supabase/env";

export const runtime = "nodejs";

const MAX_RAW_TEXT_CHARS = 12_000;

const requestSchema = z.object({
  rawText: z.string().trim().min(8).max(MAX_RAW_TEXT_CHARS),
});

type ParseAbeSuccess = {
  ok: true;
  fields: AbeCoreParseResult;
};

type ParseAbeError = {
  ok: false;
  error: string;
  code: "unauthorized" | "bad_request" | "config" | "parse_failed";
};

function jsonError(
  status: number,
  error: string,
  code: ParseAbeError["code"],
) {
  const body: ParseAbeError = { ok: false, error, code };
  return NextResponse.json(body, { status });
}

/**
 * POST /api/ocr/parse-abe
 * Specialized ABE step: structured core metadata from Azure OCR text.
 * Ignores Verwendungsbereich / vehicle fitment tables by design.
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
        "rawText is required (min 8 characters). PDF ohne Textschicht oder leerer OCR-Text.",
        "bad_request",
      );
    }

    let fields: AbeCoreParseResult;
    try {
      fields = await extractAbeFromText(parsedBody.data.rawText);
    } catch (error) {
      const message =
        error instanceof TextParseError
          ? error.message
          : "Failed to parse ABE text.";
      return jsonError(422, message, "parse_failed");
    }

    const body: ParseAbeSuccess = { ok: true, fields };
    return NextResponse.json(body, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected parse-abe error.";
    return jsonError(500, message, "parse_failed");
  }
}
