import type OpenAI from "openai";

import { extractJsonObject } from "@/lib/ocr/json-from-llm";
import { getOcrLlmClient } from "@/lib/ocr/llm-client";
import { resolveAbeContextModel } from "@/services/ocr/AbeExtractionService";
import { TextParseError } from "@/lib/ocr/parse-error";
import {
  MissingVinError,
  normalizeParagraph21Extraction,
  PARAGRAPH_21_JSON_SCHEMA,
  Paragraph21LlmPayloadSchema,
  verifyVehicleMatch,
  type Paragraph21Extraction,
} from "@/lib/validations/paragraph21Schema";

export const PARAGRAPH_21_MAX_CHARS = 24_000;
const PARAGRAPH_21_MAX_TOKENS = 1_800;

export type Paragraph21ExtractionResult = Paragraph21Extraction & {
  /** Null when no garage VIN was supplied for verification. */
  vinMatchesGarage: boolean | null;
};

export type Paragraph21ExtractionOptions = {
  /** Garage twin VIN for Field E verification. */
  garageVin?: string | null;
  /** Override chat deployment. */
  model?: string;
  maxChars?: number;
};

/**
 * System prompt for German §21 Einzelbetriebserlaubnis OCR extraction.
 * Document layout mirrors Fahrzeugschein grid fields.
 */
export function buildParagraph21SystemPrompt(): string {
  return [
    "You are a strict data extractor for German automotive approval documents.",
    'Target document: "Einzelbetriebserlaubnis gem. §21 StVZO" (Individual Approval / Einzelabnahme).',
    "This is NOT an ABE (Allgemeine Betriebserlaubnis) and NOT a Teilegutachten.",
    "The layout mimics the German vehicle registration certificate (Fahrzeugschein) with labeled grid fields.",
    "",
    "Extract these registration-style fields:",
    '- Field E → "vin" (Fahrgestellnummer). CRITICAL — document is invalid without it.',
    '- Field 2 → "manufacturer" (Hersteller), e.g. "YAMAHA (J)".',
    '- Field D.3 → "model" (Handelsbezeichnung), e.g. "SRX 600".',
    '- Field 22 → "modificationsField22" (Bemerkungen / Änderungen).',
    "",
    "Field 22 is the MOST IMPORTANT free-text block.",
    "Extract the ENTIRE Field 22 text EXACTLY as written — verbatim, no summarization.",
    "Preserve asterisks (*), abbreviations, colons, and line breaks inside the string.",
    'Example fragment: "AUSN.:FAHRTRICHTANZ.FEDERND BEFESTIGT*...".',
    "",
    'Also extract "documentNumber" (top of form), "issueDate" (Ausstellungsdatum),',
    'and "additionalRemarks" under "Zusätzliche Bemerkungen zur Fahrzeugbeschreibung" if present.',
    "",
    "Return ONLY valid JSON matching the schema.",
    "Use null for fields not found — except attempt hard to find Field E (vin).",
  ].join(" ");
}

/**
 * Dedicated §21 StVZO extractor — vehicle-bound Individual Approval documents.
 */
export class Paragraph21ExtractionService {
  async extractParagraph21(
    markdownText: string,
    options: Paragraph21ExtractionOptions = {},
  ): Promise<Paragraph21ExtractionResult> {
    const windowText = markdownText
      .replace(/\r\n/g, "\n")
      .trim()
      .slice(0, options.maxChars ?? PARAGRAPH_21_MAX_CHARS);

    if (windowText.length < 8) {
      throw new TextParseError(
        "OCR-Text ist zu kurz für die §21-Extraktion.",
      );
    }

    const model =
      options.model?.trim() || resolveAbeContextModel();

    let client: OpenAI;
    let resolvedModel: string;
    try {
      ({ client, model: resolvedModel } = getOcrLlmClient({ model }));
    } catch (error) {
      throw new TextParseError(
        error instanceof Error ? error.message : "LLM client is not configured.",
      );
    }

    const systemPrompt = buildParagraph21SystemPrompt();
    const userContent = [
      "German §21 Einzelbetriebserlaubnis OCR (Markdown).",
      "Extract Field E (vin), Field 2, Field D.3, Field 22 verbatim, documentNumber, issueDate, additionalRemarks.",
      "",
      windowText,
    ].join("\n");

    let completion: OpenAI.Chat.Completions.ChatCompletion;
    try {
      completion = await client.chat.completions.create({
        model: resolvedModel,
        max_completion_tokens: PARAGRAPH_21_MAX_TOKENS,
        response_format: {
          type: "json_schema",
          json_schema: PARAGRAPH_21_JSON_SCHEMA,
        },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "LLM request failed.";
      throw new TextParseError(`§21 extract failed: ${message}`);
    }

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new TextParseError("§21 extract returned an empty response.");
    }

    let parsedJson: unknown;
    try {
      parsedJson = extractJsonObject(content);
    } catch {
      throw new TextParseError("§21 extract returned invalid JSON.");
    }

    const parsed = Paragraph21LlmPayloadSchema.safeParse(parsedJson);
    if (!parsed.success) {
      throw new TextParseError(
        "§21 extract payload failed schema validation.",
      );
    }

    let extracted: Paragraph21Extraction;
    try {
      extracted = normalizeParagraph21Extraction(parsed.data);
    } catch (error) {
      if (error instanceof MissingVinError) {
        throw error;
      }
      throw new TextParseError(
        error instanceof Error ? error.message : "§21 normalization failed.",
      );
    }

    const garageVin = options.garageVin?.trim();
    const vinMatchesGarage = garageVin
      ? verifyVehicleMatch(extracted.vin, garageVin)
      : null;

    return {
      ...extracted,
      vinMatchesGarage,
    };
  }
}

export const paragraph21ExtractionService = new Paragraph21ExtractionService();
