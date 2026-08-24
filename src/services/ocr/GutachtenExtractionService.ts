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

const GUTACHTEN_MAX_TOKENS = 3_200;

export function buildGutachtenSystemPrompt(): string {
  return [
    "You are a strict data extractor for German automotive approval and inspection documents.",
    "Target: PAGE 1 / cover — classify the document AND extract every readable header field.",
    "",
    "documentSubtype rules (choose exactly ONE — do not confuse §19 Abs. 2 with §19 Abs. 3):",
    "- TEILEGUTACHTEN: Title TEILEGUTACHTEN, § 19 Abs. 3 StVZO, Verwendungsbereich table, Kennzeichnung, Art der Umrüstung.",
    "- EINZELABNAHME: § 21 StVZO Einzelbetriebserlaubnis, Fahrzeugschein grid Felder E / 2 / D.3 / 22.",
    "- ANBAUBESTAETIGUNG: Prüfung nach § 19 Abs. 2 StVZO, Untersuchungsbericht, Anbauabnahme, Gutachten zur Erlangung der BE, technische Vorschriften.",
    "- SONSTIGES: Only when none of the above markers are visible on page 1.",
    "",
    "Cover-page extraction (critical — extract ALL visible fields, do NOT wait for follow-up scans):",
    '- partName: short component / modification label (e.g. KW V3 Gewindefahrwerk).',
    '- modificationType: FULL "Art der Umrüstung" / Fahrzeugteil block verbatim when present.',
    '- manufacturer: Hersteller / Herstellerzeichen.',
    '- certificateNumber: Gutachten-Nr., Bericht-Nr., Aktenzeichen.',
    '- testOrganization: Prüforganisation / issuer (TÜV, DEKRA, GTÜ, KÜS).',
    '- issueDate: Ausstellungsdatum as YYYY-MM-DD.',
    '- markingType + markingNumber: Kennzeichnung section when visible on page 1.',
    '- conditions: Section IV Auflagen — one array item per subsection or bullet when readable on page 1.',
    '- ownerNotes: Section III Hinweise für den Fahrzeughalter verbatim when on page 1.',
    '- matchedVehicleRow: matched Verwendungsbereich row as "Hersteller · Typ · Modell" when table visible.',
    '- vehicleMatchNotes: Für Fz-Typen / vehicle restriction summary when no full table.',
    '- vin: Field E Fahrgestellnummer when §21 / §19(2) grid visible.',
    '- modificationsField22: Field 22 Bemerkungen verbatim when visible on cover.',
    "",
    "If a section is NOT on this page, return null — do NOT guess.",
    "documentSubtype must always be set — prefer best match, use SONSTIGES when uncertain.",
    "Return ONLY valid JSON.",
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
        "German Gutachten / Prüfbericht — PAGE 1 / cover scan.",
        "Detect subtype and extract ALL readable header metadata from this page.",
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
