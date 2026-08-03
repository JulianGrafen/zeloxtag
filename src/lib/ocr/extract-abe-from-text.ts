import type OpenAI from "openai";

import { extractKbaNumber, isPlausibleKbaNumber } from "./abe-from-text";
import {
  ABE_CORE_PARSE_JSON_SCHEMA,
  abeCoreParseSchema,
  normalizeAbeCoreParseResult,
  type AbeCoreParseResult,
} from "./abe-parse-schema";
import { getInvoiceLlmClient } from "./llm-client";
import { TextParseError } from "./extract-from-text";
import {
  extractAbeManufacturer,
  extractAbePartName,
  resolveAbePartIdentity,
} from "./part-from-text";

const PARSE_MAX_TOKENS = 400;
const MAX_RAW_TEXT_CHARS = 10_000;

const ABE_SYSTEM_PROMPT = `Du bist ein spezialisierter Parser für deutsche ABE-/Teilegutachten-Dokumente.

Extrahiere NUR die Kern-Metadaten als JSON gemäß Schema.
Setze fehlende oder unleserliche Werte auf null (außer partCategory → "other").

WICHTIG — ignoriere vollständig:
- den Abschnitt "Verwendungsbereich" und alle Fahrzeug-/Typ-/EG-Zulassungstabellen
- Auflagenlisten, Montagehinweise, Unterschriften, Stempel, Seitenköpfe/-füße
- lange Typenschlüssel- oder Fahrgestell-Tabellen

kbaNumber: bevorzugt genau "KBA #####" (5 Ziffern). Auch wenn OCR
"KBA" und die Ziffern auf getrennten Zeilen hat.

Ziel: minimale Token-Nutzung, keine Halluzination von Fahrzeugfreigaben.
Keine Erklärungen — nur JSON.`;

/**
 * Drop bulky Verwendungsbereich / fitment sections before the LLM call.
 * Defensive: if markers are missing, returns the original text unchanged.
 */
export function stripAbeFitmentSections(rawText: string): string {
  const text = rawText.replace(/\r\n/g, "\n");
  const start = text.search(/verwendungsbereich/i);
  if (start < 0) return text;

  const tail = text.slice(start);
  const resume = tail.search(
    /\n\s*(auflage|auflagen|hinweis|hinweise|bedingungen|bemerkungen|anlage\b|seite\s+\d)/i,
  );

  if (resume < 0) {
    return `${text.slice(0, start)}\n`.trim();
  }

  return `${text.slice(0, start)}\n${tail.slice(resume)}`.trim();
}

function extractJsonObject(content: string): unknown {
  const trimmed = content.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced?.[1]) {
      return JSON.parse(fenced[1].trim());
    }
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error("No JSON object found.");
  }
}

/**
 * Specialized ABE core extraction (KBA, manufacturer, category, part type).
 * Does not extract Verwendungsbereich / vehicle fitment tables.
 */
export async function extractAbeFromText(
  rawText: string,
): Promise<AbeCoreParseResult> {
  const stripped = stripAbeFitmentSections(rawText);
  const text = stripped.replace(/\s+/g, " ").trim().slice(0, MAX_RAW_TEXT_CHARS);

  if (text.length < 8) {
    throw new TextParseError(
      "OCR-Text ist zu kurz oder enthält keine lesbare ABE-Information.",
    );
  }

  let client: OpenAI;
  let model: string;
  try {
    ({ client, model } = getInvoiceLlmClient());
  } catch (error) {
    throw new TextParseError(
      error instanceof Error ? error.message : "LLM client is not configured.",
    );
  }

  if (/^zeloxta/i.test(model)) {
    model = "gpt-5.4-nano";
  }

  let completion: OpenAI.Chat.Completions.ChatCompletion;
  try {
    completion = await client.chat.completions.create({
      model,
      max_completion_tokens: PARSE_MAX_TOKENS,
      response_format: {
        type: "json_schema",
        json_schema: ABE_CORE_PARSE_JSON_SCHEMA,
      },
      messages: [
        { role: "system", content: ABE_SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            "OCR-Text einer ABE / eines Teilegutachtens (Azure prebuilt-read).",
            "Extrahiere nur: kbaNumber, manufacturer, partCategory, partType.",
            "Ignoriere Verwendungsbereich und Fahrzeugtabellen.",
            "",
            text,
          ].join("\n"),
        },
      ],
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "LLM request failed.";
    throw new TextParseError(`ABE parse request failed: ${message}`);
  }

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new TextParseError("ABE parse returned an empty response.");
  }

  let parsedJson: unknown;
  try {
    parsedJson = extractJsonObject(content);
  } catch {
    throw new TextParseError("ABE parse returned invalid JSON.");
  }

  const parsed = abeCoreParseSchema.safeParse(parsedJson);
  if (!parsed.success) {
    throw new TextParseError("ABE parse payload failed schema validation.");
  }

  const normalized = normalizeAbeCoreParseResult(parsed.data);
  const identity = resolveAbePartIdentity({
    structuredVendor: normalized.partType,
    structuredManufacturer: normalized.manufacturer,
    rawText,
  });

  return {
    ...normalized,
    kbaNumber: isPlausibleKbaNumber(normalized.kbaNumber)
      ? normalized.kbaNumber
      : extractKbaNumber(rawText),
    manufacturer:
      identity.manufacturer ??
      extractAbeManufacturer(rawText) ??
      normalized.manufacturer,
    partType:
      identity.vendor ?? extractAbePartName(rawText) ?? normalized.partType,
  };
}
