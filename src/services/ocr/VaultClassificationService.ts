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
    "Du klassifizierst deutsche ABE- und Gutachten-Dokumente (Teilegutachten, Einzelabnahme, ABE).",
    "Gib einen kurzen Bauteil-/Produkttitel, eine Kategorie und den Dokumenttyp zurück.",
    "Keine Daten, Preise, KBA-Nummern oder Fahrzeugdaten extrahieren.",
    "Titel: präziser Produktname (max. ~8 Wörter), z. B. 'KW V3 Gewindefahrwerk'.",
    "Kategorie: passender Enum-Wert für das Bauteil.",
    "documentKind: abe | teilegutachten | einzelabnahme | pruefung192 | egbe | gutachten — oder null wenn unklar.",
    "Teilegutachten erkennst du an §19 Abs. 3, 'Teilegutachten', Gutachtennummer auf dem Deckblatt.",
    "Wenn unleserlich: Titel 'Unbekanntes Bauteil', category SONSTIGES, documentKind null.",
    "Nur gültiges JSON zurückgeben.",
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
        "Deutsches ABE- / Gutachten-Dokument — Bauteil und Dokumenttyp erkennen.",
        "Teilegutachten (§19 Abs. 3) von Einzelabnahme (§21) und ABE unterscheiden.",
        "Gib title, category und documentKind zurück. Alles andere ignorieren.",
      ],
      input,
      { maxPdfPages: 2 },
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
