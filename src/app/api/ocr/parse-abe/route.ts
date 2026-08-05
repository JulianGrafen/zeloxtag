import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { isLlmConfigured } from "@/lib/ocr/llm-client";
import { TextParseError } from "@/lib/ocr/parse-error";
import {
  enforceRateLimit,
  enforceSameOrigin,
  requireApiUser,
} from "@/lib/security/api-guard";
import { parseStrictBody, readJsonBody } from "@/lib/security/parse-body";
import {
  AbeVehicleContextSchema,
  type AbeMinimal,
} from "@/lib/validations/abeSchema";
import { abeExtractionService } from "@/services/ocr/AbeExtractionService";

export const runtime = "nodejs";

/** Wider limit when vehicleContext requires Verwendungsbereich pages. */
const MAX_RAW_TEXT_CHARS = 48_000;

const requestSchema = z
  .object({
    rawText: z.string().trim().min(8).max(MAX_RAW_TEXT_CHARS),
    vehicleContext: AbeVehicleContextSchema.optional().nullable(),
  })
  .strict();

type ParseAbeSuccess = {
  ok: true;
  fields: AbeMinimal;
};

type ParseAbeError = {
  ok: false;
  error: string;
  code: "unauthorized" | "bad_request" | "config" | "parse_failed" | "rate_limited";
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
 * Cover extract, or context-aware Verwendungsbereich match when vehicleContext set.
 */
export async function POST(request: NextRequest) {
  try {
    const originBlocked = enforceSameOrigin(request);
    if (originBlocked) return originBlocked;
    const limited = await enforceRateLimit(request, "ocr", "parse-abe");
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

    const bodyRead = await readJsonBody(request);
    if (!bodyRead.ok) {
      return jsonError(400, bodyRead.error, "bad_request");
    }

    const parsedBody = parseStrictBody(requestSchema, bodyRead.json);
    if (!parsedBody.ok) {
      return jsonError(
        400,
        "rawText is required; vehicleContext must be { brand, model, type?, egBe? } when set.",
        "bad_request",
      );
    }

    let fields: AbeMinimal;
    try {
      fields = await abeExtractionService.extractFromText(
        parsedBody.data.rawText,
        { vehicleContext: parsedBody.data.vehicleContext ?? null },
      );
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
