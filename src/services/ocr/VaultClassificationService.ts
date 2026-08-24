import type OpenAI from "openai";

import { extractJsonObject } from "@/lib/ocr/json-from-llm";
import {
  buildAbeVisionUserMessage,
  type DocumentBytesInput,
} from "@/lib/ocr/prepare-document-for-llm";
import { getOcrLlmClient } from "@/lib/ocr/llm-client";
import { TextParseError } from "@/lib/ocr/parse-error";
import { resolveAbeContextModel } from "@/services/ocr/AbeExtractionService";
import {
  normalizeVaultClassification,
  VAULT_CLASSIFICATION_JSON_SCHEMA,
  type VaultClassification,
} from "@/lib/validations/vaultClassificationSchema";

const VAULT_CLASSIFY_MAX_TOKENS = 280;

function buildVaultClassificationSystemPrompt(): string {
  return [
    "You classify German automotive approval documents (ABE, Teilegutachten, Gutachten).",
    "Return a short part/product title, a broad category, and the document type if recognizable.",
    "Do NOT extract dates, prices, KBA numbers, paragraphs, or vehicle data.",
    "Title: concise product name (max ~8 words), e.g. 'KW V3 Gewindefahrwerk'.",
    "Category: pick the best enum value for the modified part.",
    "documentKind: abe | teilegutachten | einzelabnahme | pruefung192 | egbe | gutachten — or null if unknown.",
    "If unreadable, use title 'Unbekanntes Bauteil', category SONSTIGES, documentKind null.",
    "Return ONLY valid JSON.",
  ].join("\n");
}

export class VaultClassificationService {
  async classifyFromDocument(
    input: DocumentBytesInput,
    options: { model?: string } = {},
  ): Promise<VaultClassification> {
    const model = options.model?.trim() || resolveAbeContextModel();

    let client: OpenAI;
    let resolvedModel: string;
    try {
      ({ client, model: resolvedModel } = getOcrLlmClient({ model }));
    } catch (error) {
      throw new TextParseError(
        error instanceof Error ? error.message : "LLM client is not configured.",
      );
    }

    const userContent = await buildAbeVisionUserMessage(
      [
        "German ABE / Gutachten document — identify the modified part and document type.",
        "Return title, category, and documentKind. Ignore all other fields.",
      ],
      input,
      { maxPdfPages: 1 },
    );

    let completion: OpenAI.Chat.Completions.ChatCompletion;
    try {
      completion = await client.chat.completions.create({
        model: resolvedModel,
        max_completion_tokens: VAULT_CLASSIFY_MAX_TOKENS,
        response_format: {
          type: "json_schema",
          json_schema: VAULT_CLASSIFICATION_JSON_SCHEMA,
        },
        messages: [
          { role: "system", content: buildVaultClassificationSystemPrompt() },
          { role: "user", content: userContent },
        ],
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "LLM request failed.";
      throw new TextParseError(`Vault classify failed: ${message}`);
    }

    const raw = completion.choices[0]?.message?.content;
    if (!raw?.trim()) {
      throw new TextParseError("Vault classify returned empty response.");
    }

    try {
      return normalizeVaultClassification(extractJsonObject(raw));
    } catch (error) {
      throw new TextParseError(
        error instanceof Error
          ? error.message
          : "Vault classify JSON invalid.",
      );
    }
  }
}

export const vaultClassificationService = new VaultClassificationService();
