import "server-only";

import type OpenAI from "openai";

import { getOcrLlmClient, isLlmConfigured } from "@/lib/ocr/llm-client";
import {
  buildRoastUserPrompt,
  ROAST_SYSTEM_PROMPT,
} from "@/lib/roast/roast-prompt";
import {
  parseVehicleRoastResult,
  VEHICLE_ROAST_JSON_SCHEMA,
  type VehicleRoastResult,
} from "@/lib/roast/roast-schema";
import type { VehicleRoastContext } from "@/lib/roast/roast-context";

const ROAST_LLM_TIMEOUT_MS = 28_000;
const ROAST_MAX_COMPLETION_TOKENS = 320;

export class VehicleRoastError extends Error {
  constructor(
    message: string,
    readonly code: "config" | "timeout" | "failed" = "failed",
  ) {
    super(message);
    this.name = "VehicleRoastError";
  }
}

function isTimeoutError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const message =
    error instanceof Error ? error.message : String((error as { message?: string }).message ?? "");
  const lower = message.toLowerCase();
  return (
    lower.includes("timeout") ||
    lower.includes("timed out") ||
    lower.includes("etimedout") ||
    lower.includes("aborterror")
  );
}

function mapLlmError(error: unknown): VehicleRoastError {
  if (isTimeoutError(error)) {
    return new VehicleRoastError(
      "Die KI hat zu lange gebraucht. Bitte erneut versuchen.",
      "timeout",
    );
  }
  const raw = error instanceof Error ? error.message : "Unbekannter KI-Fehler.";
  const lower = raw.toLowerCase();
  if (lower.includes("rate") && lower.includes("limit")) {
    return new VehicleRoastError(
      "KI ist gerade ausgelastet. Bitte in ein paar Sekunden erneut versuchen.",
    );
  }
  return new VehicleRoastError("Roast konnte nicht erzeugt werden.");
}

async function createRoastCompletion(
  client: OpenAI,
  model: string,
  userPrompt: string,
): Promise<string> {
  const baseMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: ROAST_SYSTEM_PROMPT },
    { role: "user", content: userPrompt },
  ];

  const jsonObjectMessages = [
    ...baseMessages,
    {
      role: "user" as const,
      content:
        'Antworte nur mit JSON: { "punchline": "hart, ein Satz, Klischee ok, keine Spec-Liste in Klammern" }',
    },
  ];

  const requestOptions = { timeout: ROAST_LLM_TIMEOUT_MS };

  try {
    const completion = await client.chat.completions.create(
      {
        model,
        max_completion_tokens: ROAST_MAX_COMPLETION_TOKENS,
        response_format: { type: "json_object" },
        messages: jsonObjectMessages,
      },
      requestOptions,
    );
    const content = completion.choices[0]?.message?.content;
    if (content?.trim()) return content;
  } catch (error) {
    const mapped = mapLlmError(error);
    if (mapped.code === "timeout") throw mapped;
    // Fall through to json_schema for providers that require structured outputs.
  }

  try {
    const completion = await client.chat.completions.create(
      {
        model,
        max_completion_tokens: ROAST_MAX_COMPLETION_TOKENS,
        response_format: {
          type: "json_schema",
          json_schema: VEHICLE_ROAST_JSON_SCHEMA,
        },
        messages: baseMessages,
      },
      requestOptions,
    );
    const content = completion.choices[0]?.message?.content;
    if (content?.trim()) return content;
  } catch (error) {
    throw mapLlmError(error);
  }

  throw new VehicleRoastError("KI-Antwort war leer.");
}

function parseRoastJson(raw: string): unknown {
  const trimmed = raw.trim();
  const jsonSlice =
    trimmed.startsWith("```") && trimmed.includes("{")
      ? trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")
      : trimmed;
  return JSON.parse(jsonSlice);
}

export async function generateVehicleBuildRoast(
  context: VehicleRoastContext,
): Promise<{ roast: VehicleRoastResult; modelId: string }> {
  if (!isLlmConfigured()) {
    throw new VehicleRoastError(
      "Roast KI ist nicht konfiguriert.",
      "config",
    );
  }

  const { client, model } = getOcrLlmClient();
  const userPrompt = buildRoastUserPrompt(context.llmContext);

  let lastParseError: VehicleRoastError | null = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const prompt =
      attempt === 0
        ? userPrompt
        : `${userPrompt}\n\nUngültig. Noch ein Versuch: harter Satz (min. 12 Zeichen), kein Motorcode, keine PS-Zahl, keine Klammer-Specs.`;

    let raw: string;
    try {
      raw = await createRoastCompletion(client, model, prompt);
    } catch (error) {
      if (error instanceof VehicleRoastError) throw error;
      throw mapLlmError(error);
    }

    let parsed: unknown;
    try {
      parsed = parseRoastJson(raw);
    } catch {
      lastParseError = new VehicleRoastError("KI-Antwort war kein gültiges JSON.");
      continue;
    }

    const roast = parseVehicleRoastResult(parsed);
    if (roast) {
      return { roast, modelId: model };
    }
    lastParseError = new VehicleRoastError("Roast-Format ungültig.");
  }

  throw lastParseError ?? new VehicleRoastError("Roast-Format ungültig.");
}
