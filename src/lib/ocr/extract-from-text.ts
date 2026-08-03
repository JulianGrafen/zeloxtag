import type OpenAI from "openai";

import {
  getConfiguredFoundryAgentName,
  loadFoundryAgentDefinition,
  ZELOXTAG_AGENT_INSTRUCTIONS,
} from "./foundry-agent";
import { getInvoiceLlmClient } from "./llm-client";
import {
  INVOICE_TEXT_PARSE_JSON_SCHEMA,
  invoiceTextParseSchema,
  normalizeTextParseResult,
  type InvoiceTextParseResult,
} from "./text-parse-schema";

const PARSE_MAX_TOKENS = 1_600;
const MAX_RAW_TEXT_CHARS = 12_000;

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
  const text = rawText.replace(/\s+/g, " ").trim().slice(0, MAX_RAW_TEXT_CHARS);
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
            "Bei Rechnungen: vendor, invoiceNumber, mileageKm (Kilometerstand als Ganzzahl),",
            "lineItems (inkl. MwSt.-Zeile), amount; ABE-Felder = null.",
            "Bei ABE/Teilegutachten: category=abe,",
            "vendor=Bauteilname/Bezeichnung (z.B. 'Carbon Frontlippe', 'OZ Felgen'),",
            "manufacturer=Hersteller/Marke (AutoExe, Milltek, OZ) — nicht Fahrzeugmarke,",
            "kbaNumber als 'KBA #####' (5 Ziffern), authority (Behörde),",
            "vehicleApprovals = NUR Fahrzeughersteller + Fahrzeugmodell",
            "(z.B. 'Mazda RX-8', 'BMW 320i'). NIEMALS technische Daten",
            "(ET, Lochkreis, Radlast, Felgengröße, EG-BE-Nr., Typcode allein).",
            "Aus Verwendungsbereich: Fahrzeughersteller + Handelsbezeichnung/Modell.",
            "conditions = jede Auflage/Nebenbestimmung VOLLSTÄNDIG und wörtlich",
            "(Abschnitt Auflagen/Nebenbestimmungen; ein Eintrag pro Punkt;",
            "keine Kürzung, keine technischen Daten aus Verwendungsbereich),",
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
    const message =
      error instanceof Error ? error.message : "LLM request failed.";
    throw new TextParseError(`Text parse request failed: ${message}`);
  }

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new TextParseError("Text parse returned an empty response.");
  }

  let parsedJson: unknown;
  try {
    parsedJson = extractJsonObject(content);
  } catch {
    throw new TextParseError("Text parse returned invalid JSON.");
  }

  const parsed = invoiceTextParseSchema.safeParse(parsedJson);
  if (!parsed.success) {
    throw new TextParseError("Text parse payload failed schema validation.");
  }

  return normalizeTextParseResult(parsed.data);
}
