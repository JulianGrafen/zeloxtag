import type OpenAI from "openai";

import {
  getConfiguredFoundryAgentName,
  loadFoundryAgentDefinition,
  ZELOXTAG_AGENT_INSTRUCTIONS,
} from "./foundry-agent";
import {
  extractInvoiceLineItemsFromText,
  preferInvoiceLineItems,
} from "./invoice-line-items-from-text";
import { getInvoiceLlmClient } from "./llm-client";
import {
  extractMileageKmFromText,
  preferMileageKm,
} from "./mileage-from-text";
import {
  INVOICE_TEXT_PARSE_JSON_SCHEMA,
  invoiceTextParseSchema,
  normalizeTextParseResult,
  type InvoiceTextParseResult,
} from "./text-parse-schema";

const PARSE_MAX_TOKENS = 2_400;
const MAX_RAW_TEXT_CHARS = 16_000;

/** Preserve line breaks so invoice positions stay separable. */
function prepareInvoiceTextForLlm(rawText: string): string {
  return rawText
    .replace(/\r\n/g, "\n")
    .replace(/[^\S\n]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, MAX_RAW_TEXT_CHARS);
}

/**
 * analyzeInvoiceDocument often passes stringified OCR JSON.
 * Prefer the nested `text` (+ header lines) so newlines survive.
 */
function resolveOcrPlainText(rawText: string): string {
  const trimmed = rawText.trim();
  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as {
        text?: unknown;
        headerLines?: unknown;
      };
      const body = typeof parsed.text === "string" ? parsed.text : "";
      const headers = Array.isArray(parsed.headerLines)
        ? parsed.headerLines
            .filter((line): line is string => typeof line === "string")
            .join("\n")
        : "";
      const combined = `${headers}\n${body}`.trim();
      if (combined.length >= 8) return combined;
    } catch {
      // Not JSON — use raw OCR text.
    }
  }
  return rawText;
}

export class TextParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TextParseError";
  }
}

function extractJsonObject(content: string): unknown {
  const trimmed = content.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    // Agents sometimes wrap JSON in markdown fences.
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
 * Parse OCR raw text into structured invoice fields.
 * Uses the Foundry agent "Zeloxtag" instructions + its model deployment
 * (API-key safe path; /threads/runs needs Entra ID).
 */
export async function extractInvoiceFromText(
  rawText: string,
): Promise<InvoiceTextParseResult> {
  const plainText = resolveOcrPlainText(rawText);
  const text = prepareInvoiceTextForLlm(plainText);
  const heuristicLineItems = extractInvoiceLineItemsFromText(plainText);
  const heuristicMileageKm = extractMileageKmFromText(plainText);

  const heuristicOnlyPayload = (): InvoiceTextParseResult =>
    normalizeTextParseResult({
      vendor: null,
      date: null,
      amount: null,
      category: "other",
      summary: null,
      lineItems: heuristicLineItems,
      kbaNumber: null,
      vehicleApprovals: null,
      authority: null,
      conditions: null,
      partCategory: null,
      notes: null,
      manufacturer: null,
      invoiceNumber: null,
      mileageKm: heuristicMileageKm,
    });

  const hasHeuristicFallback = Boolean(
    heuristicLineItems?.length || heuristicMileageKm,
  );

  if (text.length < 8) {
    throw new TextParseError("OCR text is too short to parse.");
  }

  let client: OpenAI;
  let fallbackModel: string;
  try {
    ({ client, model: fallbackModel } = getInvoiceLlmClient());
  } catch (error) {
    throw new TextParseError(
      error instanceof Error ? error.message : "LLM client is not configured.",
    );
  }

  let systemInstructions = ZELOXTAG_AGENT_INSTRUCTIONS;
  let model = fallbackModel;

  try {
    const agent = await loadFoundryAgentDefinition(
      getConfiguredFoundryAgentName(),
    );
    if (agent) {
      systemInstructions = agent.instructions;
      model = agent.model;
    }
  } catch {
    // Keep static fallback instructions if agent metadata cannot be loaded.
  }

  // Never send an agent name as the chat model — that yields DeploymentNotFound.
  if (/^zeloxta/i.test(model)) {
    model = fallbackModel === model ? "gpt-5.4-nano" : fallbackModel;
  }

  let completion: OpenAI.Chat.Completions.ChatCompletion;
  try {
    completion = await client.chat.completions.create({
      model,
      max_completion_tokens: PARSE_MAX_TOKENS,
      response_format: {
        type: "json_schema",
        json_schema: INVOICE_TEXT_PARSE_JSON_SCHEMA,
      },
      messages: [
        {
          role: "system",
          content: systemInstructions,
        },
        {
          role: "user",
          content: [
            "Nachfolgend OCR-JSON eines Kfz-Dokuments (prebuilt-read).",
            "Extrahiere alle Schema-Felder.",
            "WICHTIG Kategorie: Eine RECHNUNG mit MwSt./Positionen/€ ist NIE category=abe,",
            "auch wenn 'ABE', '§19' oder 'KBA' auf der Teile-Rechnung erwähnt wird.",
            "category=abe nur bei echtem Teilegutachten / Allgemeiner Betriebserlaubnis.",
            "Bei Rechnungen: vendor, invoiceNumber,",
            "mileageKm = Kilometerstand/Tachostand/km-Stand als ganze Zahl (z.B. 67210),",
            "lineItems (JEDE Position einzeln), amount; ABE-Felder = null.",
            "lineItems-Regeln (PFLICHT):",
            "- Eine Array-Zeile pro Rechnungsposten (Material, Arbeitslohn, MwSt.).",
            "- Material IMMER getrennt: Reifen, Felgen, Sportfedern, Federn, Fahrwerk,",
            "  Auspuff, Bremsen, Motoröl, Ölfilter, Batterie, Ersatzteile usw.",
            "- NICHT zusammenfassen (falsch: 'Reifen und Sportfedern 800').",
            "- Richtig: {label:'Reifen …', amount}, {label:'Sportfedern …', amount}.",
            "- amount = immer GESAMTPREIS / Zeilensumme (Menge × Einzelpreis).",
            "- NIEMALS den Einzelpreis/Stückpreis als amount nehmen.",
            "  Beispiel: 4 × 120,00 → amount: 480 (nicht 120).",
            "- Bei mehreren Geldbeträgen in einer Zeile: den rechten/letzten = Gesamt.",
            "- Labels kurz und klar abschneiden; Beträge als Zahl (Punkt-Dezimal).",
            "- MwSt.-Zeile am Ende behalten, wenn ausgewiesen.",
            "Ölwechsel/Motoröl/Ölfilter → category=service, summary z.B. 'Ölwechsel · 5W-30'.",
            "mileageKm PFLICHT wenn 'Kilometerstand', 'km-Stand', 'Tachostand' oder '… km' lesbar.",
            "Bei ABE/Teilegutachten: category=abe, vendor=Bauteilname,",
            "manufacturer=NUR Hersteller/Herstellerzeichen (nie Auftraggeber/Antragsteller),",
            "kbaNumber, vehicleApprovals, authority (Behörde),",
            "conditions = jede Auflage VOLLSTÄNDIG und wörtlich (keine Kürzung,",
            "keine Paraphrase; ein Eintrag pro Auflagepunkt),",
            "partCategory (Aerodynamik/Räder/Fahrwerk/…),",
            "notes = 1-3 Sätze Freigabe-Beschreibung, lineItems=null, amount=null.",
            "Bei TÜV/HU: category=tuev; ABE-Felder und lineItems = null.",
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
    throw new TextParseError(`Text parse request failed: ${message}`);
  }

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    if (hasHeuristicFallback) return heuristicOnlyPayload();
    throw new TextParseError("Text parse returned an empty response.");
  }

  let parsedJson: unknown;
  try {
    parsedJson = extractJsonObject(content);
  } catch {
    if (hasHeuristicFallback) return heuristicOnlyPayload();
    throw new TextParseError("Text parse returned invalid JSON.");
  }

  const parsed = invoiceTextParseSchema.safeParse(parsedJson);
  if (!parsed.success) {
    if (hasHeuristicFallback) return heuristicOnlyPayload();
    throw new TextParseError("Text parse payload failed schema validation.");
  }

  const normalized = normalizeTextParseResult(parsed.data);
  return {
    ...normalized,
    lineItems: preferInvoiceLineItems(
      normalized.lineItems,
      heuristicLineItems,
    ),
    mileageKm: preferMileageKm(normalized.mileageKm, plainText),
  };
}
