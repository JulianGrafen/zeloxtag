import type OpenAI from "openai";

import { extractJsonObject } from "@/lib/ocr/json-from-llm";
import {
  buildAbeVisionUserMessage,
  type DocumentBytesInput,
} from "@/lib/ocr/prepare-document-for-llm";
import { getOcrLlmClient } from "@/lib/ocr/llm-client";
import { resolveAbeContextModel } from "@/services/ocr/AbeExtractionService";
import { TextParseError } from "@/lib/ocr/parse-error";
import {
  emptyParagraph192LlmPayload,
  mergeParagraph192Extractions,
  normalizeParagraph192Extraction,
  PARAGRAPH_192_JSON_SCHEMA,
  Paragraph192LlmPayloadSchema,
  verifyPruefung192VinMatch,
  type Paragraph192Extraction,
} from "@/lib/validations/paragraph192Schema";

export const PARAGRAPH_192_MAX_CHARS = 28_000;
const PARAGRAPH_192_MAX_TOKENS = 2_400;

export type Paragraph192ExtractionResult = Paragraph192Extraction & {
  vinMatchesGarage: boolean | null;
};

export type Paragraph192ExtractionOptions = {
  garageVin?: string | null;
  model?: string;
  maxChars?: number;
  zbTablePreserved?: boolean;
};

export function buildParagraph192SystemPrompt(): string {
  return [
    "You are a strict data extractor for German automotive inspection documents.",
    'Target: "Prüfung nach § 19 Abs. 2 StVZO i.V. § 21 StVZO" (TÜV/DEKRA inspection after vehicle modification).',
    "This is NOT an ABE, NOT a Teilegutachten (§19.3), NOT a standalone §21 Einzelabnahme form.",
    "",
    "Document set typically includes:",
    "1) Untersuchungsbericht — vehicle data table, Prüftermin, Ergebnis, Kennzeichen, VIN.",
    "2) Gutachten zur Erlangung der Betriebserlaubnis — ZB-style grid (B,J,E,2.1…) + Field 22 text.",
    "3) Aufstellung der technischen Vorschriften — begutachtete Änderungen, Typgenehmigung Basisfahrzeug.",
    "",
    "Extract structured fields only — never summarize Field 22.",
    "Return ONLY valid JSON matching the schema.",
  ].join(" ");
}

export function buildParagraph192BerichtSystemPrompt(): string {
  return [
    buildParagraph192SystemPrompt(),
    "",
    "INPUT: Untersuchungsbericht page (title contains 'Prüfung nach § 19(2) StVZO').",
    "Extract: reportNumber, inspectionDate, vin, licensePlate, manufacturer, vehicleType, variant,",
    "ownerName, testingOrganization, inspectionLocation, inspectionResultText, mileageKm,",
    "firstRegistration, lastHu, officialExpert.",
    "Set field22Text, assessedModifications, typeApprovalBase to null.",
  ].join(" ");
}

export function buildParagraph192GutachtenSystemPrompt(): string {
  return [
    buildParagraph192SystemPrompt(),
    "",
    "INPUT: Gutachten zur Erlangung der Betriebserlaubnis page.",
    "Extract ONLY field22Text — the Bemerkungen / Änderungen block (Field 22). Verbatim, no summary.",
    "Do NOT extract or return the ZB grid table (Felder B, J, E, 2.1, D.1, D.2, D.3, etc.) — that is preserved as a cropped image.",
    "Also extract reportNumber and inspectionDate from the header if visible.",
    "Set all other fields to null.",
  ].join(" ");
}

export function buildParagraph192VorschriftenSystemPrompt(): string {
  return [
    buildParagraph192SystemPrompt(),
    "",
    "INPUT: Aufstellung der technischen Vorschriften page(s).",
    "Extract: assessedModifications (line after 'begutachtete Änderungen:'),",
    "typeApprovalBase (Typgenehmigungsnr. Basisfahrzeug), vin, reportNumber, inspectionDate.",
    "Set field22Text to null.",
  ].join(" ");
}

export class Paragraph192ExtractionService {
  async extractFromDocument(
    input: DocumentBytesInput,
    options: Paragraph192ExtractionOptions = {},
  ): Promise<Paragraph192ExtractionResult> {
    return this.runVisionExtract(
      input,
      buildParagraph192SystemPrompt(),
      [
        "German §19(2) StVZO inspection document set.",
        "Extract all available fields from every visible section.",
      ],
      options,
    );
  }

  async extractBerichtPage(
    input: DocumentBytesInput,
    options: Paragraph192ExtractionOptions = {},
  ): Promise<Paragraph192ExtractionResult> {
    return this.runVisionExtract(
      input,
      buildParagraph192BerichtSystemPrompt(),
      [
        "Untersuchungsbericht — Prüfung nach § 19(2) StVZO.",
        "Extract vehicle identifiers, Prüftermin, Ergebnis, Halter, Prüforganisation.",
      ],
      options,
    );
  }

  async extractGutachtenField22(
    input: DocumentBytesInput,
    options: Paragraph192ExtractionOptions = {},
  ): Promise<Paragraph192ExtractionResult> {
    return this.runVisionExtract(
      input,
      buildParagraph192GutachtenSystemPrompt(),
      [
        "Gutachten zur Erlangung der Betriebserlaubnis — extract Field 22 text ONLY.",
        "Ignore the ZB data grid (Felder B, J, E, 2.1 …).",
      ],
      { ...options, requireVin: false },
    );
  }

  async extractVorschriftenPage(
    input: DocumentBytesInput,
    options: Paragraph192ExtractionOptions = {},
  ): Promise<Paragraph192ExtractionResult> {
    return this.runVisionExtract(
      input,
      buildParagraph192VorschriftenSystemPrompt(),
      [
        "Aufstellung der technischen Vorschriften — begutachtete Änderungen.",
      ],
      { ...options, requireVin: false },
    );
  }

  private async runVisionExtract(
    input: DocumentBytesInput,
    systemPrompt: string,
    instructionLines: string[],
    options: Paragraph192ExtractionOptions & { requireVin?: boolean } = {},
  ): Promise<Paragraph192ExtractionResult> {
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

    const userContent = await buildAbeVisionUserMessage(instructionLines, input, {
      maxPdfPages: 2,
    });

    let completion: OpenAI.Chat.Completions.ChatCompletion;
    try {
      completion = await client.chat.completions.create({
        model: resolvedModel,
        max_completion_tokens: PARAGRAPH_192_MAX_TOKENS,
        response_format: {
          type: "json_schema",
          json_schema: PARAGRAPH_192_JSON_SCHEMA,
        },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "LLM request failed.";
      throw new TextParseError(`§19(2) extract failed: ${message}`);
    }

    const raw = completion.choices[0]?.message?.content;
    if (!raw?.trim()) {
      throw new TextParseError("§19(2) extract returned empty response.");
    }

    let parsed: unknown;
    try {
      parsed = extractJsonObject(raw);
    } catch {
      throw new TextParseError("§19(2) extract returned invalid JSON.");
    }

    const payload = Paragraph192LlmPayloadSchema.parse({
      ...emptyParagraph192LlmPayload(),
      ...(typeof parsed === "object" && parsed !== null ? parsed : {}),
    });

    const normalized = normalizeParagraph192Extraction(payload, {
      zbTablePreserved: options.zbTablePreserved ?? false,
      requireVin: options.requireVin,
    });

    const garageVin = options.garageVin?.trim();
    const vinMatchesGarage =
      garageVin && normalized.vin !== "UNKNOWN"
        ? verifyPruefung192VinMatch(normalized.vin, garageVin)
        : null;

    return { ...normalized, vinMatchesGarage };
  }
}

export function mergeParagraph192ExtractionResults(
  ...parts: Paragraph192ExtractionResult[]
): Paragraph192ExtractionResult {
  if (parts.length === 0) {
    throw new Error("At least one extraction part required.");
  }

  let merged = parts[0]!;
  for (let index = 1; index < parts.length; index += 1) {
    merged = {
      ...mergeParagraph192Extractions(merged, parts[index]!),
      vinMatchesGarage:
        parts[index]!.vinMatchesGarage ?? merged.vinMatchesGarage,
    };
  }
  return merged;
}

export const paragraph192ExtractionService = new Paragraph192ExtractionService();
