import type OpenAI from "openai";

import {
  budgetAbeOcrText,
  extractAbeConditionsFromText,
  preferAbeConditions,
  preferAbeManufacturer,
  stripAbeFitmentSections,
} from "./abe-from-text";
import {
  ABE_CORE_PARSE_JSON_SCHEMA,
  abeCoreParseSchema,
  normalizeAbeCoreParseResult,
  type AbeCoreParseResult,
} from "./abe-parse-schema";
import {
  extractAbeTechnicalSpecsFromText,
  preferAbeTechnicalSpecs,
} from "./abe-technical-specs-from-text";
import { getInvoiceLlmClient } from "./llm-client";
import { TextParseError } from "./extract-from-text";

const PARSE_MAX_TOKENS = 2_200;
/** Larger budget — Auflagen sit late in multi-page ABEs. */
const MAX_RAW_TEXT_CHARS = 48_000;

const ABE_SYSTEM_PROMPT = `Du bist ein spezialisierter Parser für deutsche ABE-/Teilegutachten-Dokumente.

Extrahiere die Kern-Metadaten als JSON gemäß Schema.
Setze fehlende oder unleserliche Werte auf null (außer partCategory → "other").

WICHTIG — ignoriere vollständig:
- den Abschnitt "Verwendungsbereich" und alle Fahrzeug-/Typ-/EG-Zulassungstabellen
- Unterschriften, Stempel, Seitenköpfe/-füße
- lange Typenschlüssel- oder Fahrgestell-Tabellen

Hersteller (manufacturer) — NICHT verwechseln:
- manufacturer = nur "Hersteller" / "Herstellerzeichen" / Marke des Bauteils
- NICHT "Auftraggeber", "Antragsteller", "Besteller", "Inverkehrbringer",
  "Importeur", "Vertreiber" — das sind andere Parteien und gehören NICHT in manufacturer
- Wenn nur Auftraggeber lesbar ist, aber kein Hersteller: manufacturer = null

Datum (date):
- Immer null — das Scandatum setzt die App clientseitig

Auflagen (conditions) — PFLICHTFELD wenn vorhanden:
- Suche Abschnitte "Auflage", "Auflagen", "Hinweise", "Bedingungen"
- Extrahiere JEDEN Auflagepunkt vollständig und möglichst wörtlich
- Keine Kürzung, keine Zusammenfassung, keine Paraphrase
- Ein Array-Eintrag pro nummerierter Auflage / Auflagepunkt
- Nur wenn wirklich keine Auflagen im Text stehen: null

Technische Maße (technicalSpecs):
- Extrahiere alle technischen Maßangaben (ET/Einpresstiefe, Breite, Durchmesser,
  Abmessungen L×B×H, Gewicht, Lochkreis, Mittenloch, Federweg, …)
- WICHTIG: Auch kryptische Zahlen-/Buchstaben-Kombinationen mit Durchmesser-Zeichen
  (Ø, ⌀, ø) vollständig speichern, z.B. "8Jx18 Ø72,6", "A12B Ø67,1 mm", "M14x1,5Ø12"
- Label z.B. "Maßcode", "Durchmesser", "Felgengröße", "Einpresstiefe (ET)"
- Format: { "label": "Maßcode", "value": "8Jx18 Ø72,6" }
- Wenn keine Maße vorhanden: null

Keine Erklärungen — nur JSON.`;

/** Preserve line breaks (needed for numbered Auflagen); collapse only spaces. */
function prepareAbeTextForLlm(rawText: string): string {
  const prepared = stripAbeFitmentSections(rawText)
    .replace(/[^\S\n]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return budgetAbeOcrText(prepared, MAX_RAW_TEXT_CHARS);
}

/** Re-export for callers that previously imported from this module. */
export { stripAbeFitmentSections } from "./abe-from-text";

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
 * Specialized ABE extraction: core metadata + fully worded Auflagen.
 * LLM result is merged with a heuristic Auflagen fallback.
 */
export async function extractAbeFromText(
  rawText: string,
): Promise<AbeCoreParseResult> {
  const text = prepareAbeTextForLlm(rawText);
  // Prefer prepared text (fitment stripped, Auflagen kept) for heuristics too.
  const heuristicConditions =
    extractAbeConditionsFromText(text) ??
    extractAbeConditionsFromText(rawText);
  const heuristicTechnicalSpecs =
    extractAbeTechnicalSpecsFromText(text) ??
    extractAbeTechnicalSpecsFromText(rawText);

  if (text.length < 8) {
    throw new TextParseError(
      "OCR-Text ist zu kurz oder enthält keine lesbare ABE-Information.",
    );
  }

  const heuristicManufacturer = preferAbeManufacturer(null, text);

  const heuristicOnlyPayload = (): AbeCoreParseResult =>
    normalizeAbeCoreParseResult({
      kbaNumber: null,
      manufacturer: heuristicManufacturer,
      partCategory: "other",
      partType: null,
      date: null,
      conditions: heuristicConditions,
      technicalSpecs: heuristicTechnicalSpecs,
    });

  const hasHeuristicFallback = Boolean(
    heuristicConditions?.length ||
      heuristicTechnicalSpecs?.length ||
      heuristicManufacturer,
  );

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
            "Extrahiere: kbaNumber, manufacturer, partCategory, partType,",
            "conditions, technicalSpecs. date immer null (Scandatum setzt die App).",
            "manufacturer = NUR Hersteller/Herstellerzeichen — NIEMALS Auftraggeber/Antragsteller.",
            "conditions = JEDE Auflage vollständig und wörtlich (Pflicht, falls vorhanden).",
            "Achte auf Überschriften wie 'Auflagen', 'Auflage', 'Hinweise'.",
            "technicalSpecs = technische Maße als {label, value}.",
            "Auch kryptische Codes mit Ø/⌀ (z.B. '8Jx18 Ø72,6') als technicalSpecs speichern.",
            "Ignoriere Verwendungsbereich und Fahrzeugtabellen.",
            "",
            text,
          ].join("\n"),
        },
      ],
    });
  } catch (error) {
    if (hasHeuristicFallback) return heuristicOnlyPayload();
    const message =
      error instanceof Error ? error.message : "LLM request failed.";
    throw new TextParseError(`ABE parse request failed: ${message}`);
  }

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    if (hasHeuristicFallback) return heuristicOnlyPayload();
    throw new TextParseError("ABE parse returned an empty response.");
  }

  let parsedJson: unknown;
  try {
    parsedJson = extractJsonObject(content);
  } catch {
    if (hasHeuristicFallback) return heuristicOnlyPayload();
    throw new TextParseError("ABE parse returned invalid JSON.");
  }

  const parsed = abeCoreParseSchema.safeParse(parsedJson);
  if (!parsed.success) {
    if (hasHeuristicFallback) return heuristicOnlyPayload();
    throw new TextParseError("ABE parse payload failed schema validation.");
  }

  const normalized = normalizeAbeCoreParseResult(parsed.data);
  return {
    ...normalized,
    manufacturer: preferAbeManufacturer(normalized.manufacturer, text),
    date: null,
    conditions: preferAbeConditions(normalized.conditions, heuristicConditions),
    technicalSpecs: preferAbeTechnicalSpecs(
      normalized.technicalSpecs,
      heuristicTechnicalSpecs,
    ),
  };
}
