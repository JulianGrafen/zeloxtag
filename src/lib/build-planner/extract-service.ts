import type OpenAI from "openai";

import {
  BUILD_PLANNER_EXTRACT_JSON_SCHEMA,
  parsePlannedModExtractResult,
  type PlannedModExtractResult,
} from "@/lib/build-planner/extract-schema";
import {
  BUILD_PLANNER_SYSTEM_PROMPT,
  buildPlannerUserPrompt,
} from "@/lib/build-planner/extract-prompt";
import { salvagePlannedModExtractFromContext } from "@/lib/build-planner/extract-salvage";
import { htmlToPlainText } from "@/lib/build-planner/normalize-extract";
import type { BuildDnaProfileContext } from "@/lib/showcase/build-dna-profile-context";
import { getOcrLlmClient, isLlmConfigured } from "@/lib/ocr/llm-client";
import { safeExternalFetch } from "@/lib/security/safe-external-fetch";

export type BuildPlannerExtractOptions = {
  /** Fahrzeug- & Build-Profil (server-seitig geladen). */
  vehicleContext?: string;
  /** Gespeicherte Profil-Daten für Fallback, wenn KI-JSON unvollständig ist. */
  salvage?: {
    userText: string;
    profile: BuildDnaProfileContext;
  };
};

export class BuildPlannerExtractError extends Error {
  constructor(
    message: string,
    readonly code: "config" | "blocked" | "extract_failed" = "extract_failed",
  ) {
    super(message);
    this.name = "BuildPlannerExtractError";
  }
}

function mapLlmRequestError(error: unknown): BuildPlannerExtractError {
  const raw =
    error instanceof Error ? error.message : "Unbekannter KI-Fehler.";
  const lower = raw.toLowerCase();

  if (lower.includes("json_schema") || lower.includes("response_format")) {
    return new BuildPlannerExtractError(
      "KI-Format nicht unterstützt. Bitte Text oder Screenshot nutzen.",
    );
  }
  if (lower.includes("image") || lower.includes("vision")) {
    return new BuildPlannerExtractError(
      "Bildanalyse ist mit dem aktuellen Modell nicht verfügbar. Bitte Text einfügen.",
    );
  }
  if (lower.includes("rate") && lower.includes("limit")) {
    return new BuildPlannerExtractError(
      "KI ist gerade ausgelastet. Bitte in ein paar Sekunden erneut versuchen.",
    );
  }

  return new BuildPlannerExtractError(
    "KI-Anfrage fehlgeschlagen. Bitte Text oder Screenshot versuchen.",
  );
}

async function createStructuredCompletion(
  client: OpenAI,
  model: string,
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
): Promise<string> {
  try {
    const completion = await client.chat.completions.create({
      model,
      max_completion_tokens: 1400,
      response_format: {
        type: "json_schema",
        json_schema: BUILD_PLANNER_EXTRACT_JSON_SCHEMA,
      },
      messages,
    });
    const content = completion.choices[0]?.message?.content;
    if (content?.trim()) return content;
  } catch (error) {
    const mapped = mapLlmRequestError(error);
    if (mapped.message.includes("Format nicht unterstützt")) {
      throw mapped;
    }
    // Fall through to json_object retry below for other API errors.
  }

  try {
    const completion = await client.chat.completions.create({
      model,
      max_completion_tokens: 1400,
      response_format: { type: "json_object" },
      messages: [
        ...messages,
        {
          role: "user",
          content:
            "Antworte nur mit JSON: title, category, estimated_price (Zahl), todos (Array aus Strings). Kein Markdown.",
        },
      ],
    });
    const content = completion.choices[0]?.message?.content;
    if (content?.trim()) return content;
  } catch (error) {
    throw mapLlmRequestError(error);
  }

  throw new BuildPlannerExtractError("KI-Antwort war leer.");
}

async function runLlmExtract(input: {
  userPrompt: string;
  image?: { bytes: Buffer; mimeType: string };
  salvage?: BuildPlannerExtractOptions["salvage"];
}): Promise<{ result: PlannedModExtractResult; model: string }> {
  if (!isLlmConfigured()) {
    throw new BuildPlannerExtractError(
      "KI ist nicht konfiguriert.",
      "config",
    );
  }

  const { client, model } = getOcrLlmClient();

  const userContent: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
    { type: "text", text: input.userPrompt },
  ];

  if (input.image) {
    userContent.push({
      type: "image_url",
      image_url: {
        url: `data:${input.image.mimeType};base64,${input.image.bytes.toString("base64")}`,
        detail: "high",
      },
    });
  }

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: BUILD_PLANNER_SYSTEM_PROMPT },
    { role: "user", content: userContent },
  ];

  const content = await createStructuredCompletion(client, model, messages);

  let parsed: unknown;
  try {
    const trimmed = content.trim();
    const jsonSlice =
      trimmed.startsWith("```") && trimmed.includes("{")
        ? trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")
        : trimmed;
    parsed = JSON.parse(jsonSlice);
  } catch {
    throw new BuildPlannerExtractError("KI-Antwort war kein gültiges JSON.");
  }

  let result = parsePlannedModExtractResult(parsed);
  if (!result && input.salvage?.profile) {
    result = salvagePlannedModExtractFromContext({
      userText: input.salvage.userText,
      profile: input.salvage.profile,
    });
  }
  if (!result) {
    throw new BuildPlannerExtractError(
      "Extraktion fehlgeschlagen. Bitte erneut versuchen oder manuell planen.",
    );
  }

  const sortedTodos = [...result.todos].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );

  return {
    result: { ...result, todos: sortedTodos },
    model,
  };
}

export async function extractPlannedModFromText(
  text: string,
  options?: BuildPlannerExtractOptions,
): Promise<{ result: PlannedModExtractResult; model: string }> {
  const userPrompt = buildPlannerUserPrompt({
    sourceKind: "text",
    textContext: text,
    vehicleContext: options?.vehicleContext,
  });
  return runLlmExtract({
    userPrompt,
    salvage: options?.salvage
      ? { userText: text, profile: options.salvage.profile }
      : undefined,
  });
}

export async function extractPlannedModFromLink(
  sourceUrl: string,
  options?: BuildPlannerExtractOptions,
): Promise<{ result: PlannedModExtractResult; model: string }> {
  const fetched = await safeExternalFetch(sourceUrl);
  if (!fetched.ok) {
    throw new BuildPlannerExtractError(
      fetched.error,
      fetched.code === "blocked" ? "blocked" : "extract_failed",
    );
  }

  const plain = htmlToPlainText(fetched.text);
  const textContext =
    plain.length >= 40
      ? plain.slice(0, 12_000)
      : `${plain}\n\n(Roh-HTML-Auszug)\n${fetched.text.slice(0, 8000)}`;

  const userPrompt = buildPlannerUserPrompt({
    sourceKind: "link",
    textContext,
    pageUrl: fetched.finalUrl,
    vehicleContext: options?.vehicleContext,
  });

  const extracted = await runLlmExtract({
    userPrompt,
    salvage: options?.salvage
      ? { userText: sourceUrl, profile: options.salvage.profile }
      : undefined,
  });
  return {
    ...extracted,
    result: {
      ...extracted.result,
      part: {
        ...extracted.result.part,
        productUrl: extracted.result.part.productUrl ?? fetched.finalUrl,
      },
    },
  };
}

export async function extractPlannedModFromImage(
  input: {
    bytes: Buffer;
    mimeType: string;
  },
  options?: BuildPlannerExtractOptions,
): Promise<{ result: PlannedModExtractResult; model: string }> {
  const userPrompt = buildPlannerUserPrompt({
    sourceKind: "image",
    textContext: "Produktfoto / Screenshot eines Tuning-Teils.",
    vehicleContext: options?.vehicleContext,
  });
  return runLlmExtract({
    userPrompt,
    image: input,
    salvage: options?.salvage
      ? { userText: "Produktfoto", profile: options.salvage.profile }
      : undefined,
  });
}
