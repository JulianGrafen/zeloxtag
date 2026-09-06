import "server-only";

import { createCanvas, loadImage } from "@napi-rs/canvas";

import {
  AUTOMOTIVE_CONTEXT_JSON_SCHEMA,
  AUTOMOTIVE_REJECTION_CODE,
  AUTOMOTIVE_REJECTION_MESSAGE,
  normalizeAutomotiveContext,
  type AutomotiveContextResult,
} from "@/lib/ocr/automotive-context-schema";
import {
  isPdfBuffer,
  isProbablyRasterImage,
  resolveDocumentContentType,
} from "@/lib/ocr/document-bytes";
import { extractJsonObject } from "@/lib/ocr/json-from-llm";
import { getOcrLlmClient } from "@/lib/ocr/llm-client";
import type { DocumentBytesInput } from "@/lib/ocr/llm-document-content";
import { DEFAULT_PARSE_MODEL } from "@/lib/ocr/model-routing";
import { buildAbeVisionUserMessage } from "@/lib/ocr/prepare-document-for-llm";
import { TextParseError } from "@/lib/ocr/parse-error";

export {
  AUTOMOTIVE_REJECTION_CODE,
  AUTOMOTIVE_REJECTION_MESSAGE,
} from "@/lib/ocr/automotive-context-schema";

const GATEKEEPER_MAX_TOKENS = 120;
const BLANK_IMAGE_SAMPLE_EDGE_PX = 32;
const BLANK_IMAGE_LUMINANCE_MAX = 8;

export class AutomotiveContextRejectedError extends Error {
  readonly code = AUTOMOTIVE_REJECTION_CODE;
  readonly reason: string | null;

  constructor(message: string, reason: string | null = null) {
    super(message);
    this.name = "AutomotiveContextRejectedError";
    this.reason = reason;
  }
}

export function isAutomotiveContextRejectedError(
  error: unknown,
): error is AutomotiveContextRejectedError {
  if (error instanceof AutomotiveContextRejectedError) return true;
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as Error).name === "AutomotiveContextRejectedError"
  );
}

export type AutomotiveGateResult =
  | { ok: true; context: AutomotiveContextResult }
  | { ok: false; error: string; reason: string | null };

function isGatekeeperDisabled(): boolean {
  const value = process.env.OCR_GATEKEEPER_DISABLED?.trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes";
}

function resolveGatekeeperModel(): string {
  return (
    process.env.FOUNDRY_MODEL_GATEKEEPER?.trim() ||
    process.env.FOUNDRY_MODEL_ECONOMY?.trim() ||
    process.env.FOUNDRY_MODEL_NAME?.trim() ||
    DEFAULT_PARSE_MODEL
  );
}

function buildAutomotiveGatekeeperSystemPrompt(): string {
  return [
    "You are a strict classifier.",
    "Determine if this document is related to automotive parts, vehicle maintenance, tuning, TÜV reports, or car registrations.",
    "Return ONLY a JSON object with keys isAutomotiveRelated (boolean) and reason (string or null).",
    "Set isAutomotiveRelated to false for food receipts, selfies, random photos, blank pages, or unrelated paperwork.",
    "When false, reason must be a short German explanation. When true, reason must be null.",
  ].join(" ");
}

async function isNearUniformBlankRasterImage(
  bytes: Buffer,
  contentType: string,
): Promise<boolean> {
  if (!isProbablyRasterImage(bytes) || isPdfBuffer(bytes)) {
    return false;
  }

  try {
    const img = await loadImage(bytes);
    const sampleEdge = Math.min(
      BLANK_IMAGE_SAMPLE_EDGE_PX,
      img.width,
      img.height,
    );
    if (sampleEdge < 1) return true;

    const canvas = createCanvas(sampleEdge, sampleEdge);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, sampleEdge, sampleEdge);
    const { data } = ctx.getImageData(0, 0, sampleEdge, sampleEdge);

    let luminanceSum = 0;
    let pixelCount = 0;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i] ?? 0;
      const g = data[i + 1] ?? 0;
      const b = data[i + 2] ?? 0;
      luminanceSum += 0.2126 * r + 0.7152 * g + 0.0722 * b;
      pixelCount += 1;
    }

    const averageLuminance = pixelCount > 0 ? luminanceSum / pixelCount : 0;
    return averageLuminance <= BLANK_IMAGE_LUMINANCE_MAX;
  } catch {
    return false;
  }
}

async function verifyAutomotiveContext(
  input: DocumentBytesInput,
): Promise<AutomotiveContextResult> {
  const model = resolveGatekeeperModel();
  const { client, model: resolvedModel } = getOcrLlmClient({ model });

  const userContent = await buildAbeVisionUserMessage(
    [
      "Klassifiziere dieses Dokument: Hat es Bezug zu Kfz-Teilen, Werkstatt, Tuning, TÜV oder Zulassung?",
      "Antworte nur mit isAutomotiveRelated und reason.",
    ],
    input,
    { maxPdfPages: 1 },
  );

  let completion;
  try {
    completion = await client.chat.completions.create({
      model: resolvedModel,
      max_completion_tokens: GATEKEEPER_MAX_TOKENS,
      response_format: {
        type: "json_schema",
        json_schema: AUTOMOTIVE_CONTEXT_JSON_SCHEMA,
      },
      messages: [
        { role: "system", content: buildAutomotiveGatekeeperSystemPrompt() },
        { role: "user", content: userContent },
      ],
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Gatekeeper LLM request failed.";
    throw new TextParseError(`Automotive gatekeeper failed: ${message}`);
  }

  const raw = completion.choices[0]?.message?.content;
  if (!raw?.trim()) {
    throw new TextParseError("Automotive gatekeeper returned empty response.");
  }

  try {
    return normalizeAutomotiveContext(extractJsonObject(raw));
  } catch (error) {
    throw new TextParseError(
      error instanceof Error
        ? error.message
        : "Automotive gatekeeper JSON invalid.",
    );
  }
}

export async function runAutomotiveGate(
  bytes: Buffer,
  contentType: string,
): Promise<AutomotiveGateResult> {
  if (isGatekeeperDisabled()) {
    return {
      ok: true,
      context: { isAutomotiveRelated: true, reason: null },
    };
  }

  const resolvedContentType = resolveDocumentContentType(bytes, contentType);
  const input: DocumentBytesInput = {
    bytes,
    contentType: resolvedContentType,
  };

  if (await isNearUniformBlankRasterImage(bytes, resolvedContentType)) {
    return {
      ok: false,
      error: AUTOMOTIVE_REJECTION_MESSAGE,
      reason: "Das Bild ist leer oder zu dunkel.",
    };
  }

  const context = await verifyAutomotiveContext(input);
  if (!context.isAutomotiveRelated) {
    return {
      ok: false,
      error: AUTOMOTIVE_REJECTION_MESSAGE,
      reason: context.reason,
    };
  }

  return { ok: true, context };
}
