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
  GUTACHTEN_JSON_SCHEMA,
  normalizeGutachtenExtraction,
  type GutachtenExtraction,
} from "@/lib/validations/gutachtenSchema";

const GUTACHTEN_MAX_TOKENS = 1_600;

export function buildGutachtenSystemPrompt(): string {
  return [
    "You are a strict data extractor for German automotive approval and inspection documents.",
    "Classify the document and extract key metadata into JSON.",
    "",
    "documentSubtype rules:",
    "- TEILEGUTACHTEN: Header contains TEILEGUTACHTEN, § 19 Abs. 3 StVZO, Prüforganisation sections, Verwendungsbereich table.",
    "- EINZELABNAHME: § 21 StVZO, Einzelbetriebserlaubnis, Fahrzeugschein-style grid (Felder E, 2, D.3, 22).",
    "- ANBAUBESTAETIGUNG: Prüfung nach § 19 Abs. 2 StVZO, Untersuchungsbericht, TÜV/DEKRA/GTÜ/KÜS Anbauabnahme after modification.",
    "- SONSTIGES: Other expert reports / Herstellerbescheinigung without clear §19/§21 header.",
    "",
    "Look for: document titles, paragraph references (§19, §21, §22 StVZO), testing authority stamps (TÜV, DEKRA, GTÜ, KÜS).",
    "",
    "Field guidance:",
    "- partName: main component or modification (e.g. KW V3 Gewindefahrwerk, Spoiler, Auspuffanlage).",
    "- manufacturer: Bauteilhersteller when visible.",
    "- certificateNumber: Gutachten-Nr., Bericht-Nr., Aktenzeichen.",
    "- testOrganization: full name of testing org if present.",
    "- issueDate: Ausstellungsdatum as YYYY-MM-DD.",
    "- vehicleMatchNotes: short Verwendungsbereich / vehicle restriction summary (one paragraph max).",
    "",
    "Return ONLY valid JSON. Use null for unknown optional fields.",
    "documentSubtype must always be set — prefer best match, use SONSTIGES when uncertain.",
  ].join("\n");
}

export class GutachtenExtractionService {
  async extractFromDocument(
    input: DocumentBytesInput,
    options: { model?: string } = {},
  ): Promise<GutachtenExtraction> {
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
        "German Gutachten / Prüfbericht document.",
        "Detect subtype (TEILEGUTACHTEN, EINZELABNAHME, ANBAUBESTAETIGUNG, SONSTIGES) and extract metadata.",
      ],
      input,
      { maxPdfPages: 12 },
    );

    let completion: OpenAI.Chat.Completions.ChatCompletion;
    try {
      completion = await client.chat.completions.create({
        model: resolvedModel,
        max_completion_tokens: GUTACHTEN_MAX_TOKENS,
        response_format: {
          type: "json_schema",
          json_schema: GUTACHTEN_JSON_SCHEMA,
        },
        messages: [
          { role: "system", content: buildGutachtenSystemPrompt() },
          { role: "user", content: userContent },
        ],
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "LLM request failed.";
      throw new TextParseError(`Gutachten extract failed: ${message}`);
    }

    const raw = completion.choices[0]?.message?.content;
    if (!raw?.trim()) {
      throw new TextParseError("Gutachten extract returned empty response.");
    }

    try {
      return normalizeGutachtenExtraction(extractJsonObject(raw));
    } catch (error) {
      throw new TextParseError(
        error instanceof Error
          ? error.message
          : "Gutachten extract JSON invalid.",
      );
    }
  }
}

export const gutachtenExtractionService = new GutachtenExtractionService();
