import type OpenAI from "openai";

import { extractJsonObject } from "@/lib/ocr/json-from-llm";
import {
  buildDocumentUserMessage,
  type DocumentBytesInput,
} from "@/lib/ocr/llm-document-content";
import { getOcrLlmClient } from "@/lib/ocr/llm-client";
import { resolveParseModel } from "@/lib/ocr/model-routing";
import { TextParseError } from "@/lib/ocr/parse-error";
import {
  normalizeTextParseResult,
  type InvoiceLineItem,
  type InvoiceTextParseResult,
} from "@/lib/ocr/text-parse-schema";
import {
  TUEV_RESULTS,
  TESTING_ORGANIZATIONS,
  TuevReportSchema,
  type TuevReport,
} from "@/lib/validations/documentSchemas";
import { sanitizeTuevPayload } from "@/services/documents/TuevReportService";

const TUEV_MAX_TOKENS = 3_600;

/** German HU/AU reports list Mängel under numbered section 6 (Punkt 6). */
export const TUEV_PUNKT6_DEFECTS_GUIDANCE =
  'Festgestellte Mängel stehen IMMER unter Punkt 6 / Abschnitt 6 (z. B. "6. Festgestellte Mängel", "6 Festgestellte Mängel", "(6) Ihr Fahrzeug weist folgende Mängel auf"). Extrahiere Mängel NUR aus Punkt 6 — andere Abschnitte ignorieren.';

/** Prüfpunkt numbers in Punkt 6 are ALWAYS dot-separated — preserve verbatim (e.g. 4.2.1, 1.3.2a). */
export const TUEV_PRUEFPUNKT_DOT_GUIDANCE =
  "Prüfpunkt-Nummern in Punkt 6 sind IMMER punktgetrennt (z. B. 4.2.1, 1.3.2a, 6.1.4, 4.7.1b). " +
  "Im checkpoint-Feld exakt so übernehmen — Punkte beibehalten, Ziffern nie zusammenziehen.";

/** Kilometerstand is under Punkt 4 / Feld 4, also sometimes in the document header. */
export const TUEV_PUNKT4_MILEAGE_GUIDANCE =
  'Kilometerstand (mileageKm) steht unter Punkt 4 / Feld 4 / (4) — z. B. "4. Kilometerstand", "4 KM-Stand", "(4) Kilometerstand". ' +
  'Alternativ im Dokumentkopf (Kopf): "KM-Stand", "Kilometerstand", "Tachostand". ' +
  'Beispiel: "142.350 km" → 142350. Tausenderpunkte entfernen.';

export const TUEV_ANTI_HALLUCINATION_GUIDANCE =
  "Wenn Punkt 6 leer ist, mangelfrei, oder das Ergebnis ohne Mängel ist: defectsTable und defectsList MÜSSEN null sein. " +
  "Erfinde NIEMALS Mängel — nur explizit in Punkt 6 gelistete Einträge extrahieren.";

export const TUEV_JSON_SCHEMA = {
  name: "tuev_report_extraction",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "testingOrganization",
      "testDate",
      "result",
      "mileageKm",
      "nextInspectionDate",
      "documentNumber",
      "defectsTable",
      "defectsList",
      "vendor",
      "amount",
      "lineItems",
    ],
    properties: {
      testingOrganization: {
        type: "string",
        enum: [...TESTING_ORGANIZATIONS],
      },
      testDate: {
        type: ["string", "null"],
        description: "Untersuchungsdatum as YYYY-MM-DD.",
      },
      result: {
        type: "string",
        enum: [...TUEV_RESULTS],
      },
      mileageKm: {
        type: ["integer", "null"],
        description:
          "Kilometerstand from Punkt 4 / Feld 4 / (4) or document header (Kopf) as whole number. " +
          'Labels: "4. Kilometerstand", KM-Stand, Kilometerstand, Tachostand.',
      },
      nextInspectionDate: {
        type: ["string", "null"],
        description: "Nächste HU as YYYY-MM.",
      },
      documentNumber: {
        type: ["string", "null"],
        description: "Vorgangs-/Berichtsnummer.",
      },
      defectsTable: {
        type: ["array", "null"],
        description:
          "Structured Mängel rows from Punkt 6 / Abschnitt 6 only (Festgestellte Mängel). " +
          "Each row: Prüfpunkt checkpoint (e.g. 1.3.2, 4.7.1b), verbatim description, EM/GM severity when shown. " +
          "Null when Punkt 6 lists no defects (mangelfrei).",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["checkpoint", "description", "severity"],
          properties: {
            checkpoint: {
              type: ["string", "null"],
              description:
                "Dot-separated Prüfpunkt from Punkt 6 exactly as printed (e.g. 4.2.1, 1.3.2a, 4.7.1b, DF6.2.6). " +
                "Always preserve dots; null only when no Prüfpunkt number is shown.",
            },
            description: {
              type: "string",
              description:
                "Verbatim Mangel description from Punkt 6 — do not summarize or omit rows.",
            },
            severity: {
              type: ["string", "null"],
              enum: ["EM", "GM", null],
              description: "EM or GM when marked in Punkt 6; null otherwise.",
            },
          },
        },
      },
      defectsList: {
        type: ["array", "null"],
        description:
          "Plain-text Mängel from Punkt 6 only — one entry per listed defect. " +
          "Null when Punkt 6 is empty or mangelfrei.",
        items: { type: "string" },
      },
      vendor: {
        type: ["string", "null"],
        description: "Prüfstelle / Filiale / Werkstatt name.",
      },
      amount: {
        type: ["number", "null"],
        description: "Gesamt-Prüfgebühr in EUR (HU/AU).",
      },
      lineItems: {
        type: ["array", "null"],
        description: "Einzelne Gebührenposten (HU, AU, …) wenn ausgewiesen.",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["label", "amount"],
          properties: {
            label: { type: "string" },
            amount: { type: "number" },
          },
        },
      },
    },
  },
} as const;

export type TuevVisionExtraction = {
  report: TuevReport;
  vendor: string | null;
  amount: number | null;
  lineItems: InvoiceLineItem[] | null;
};

/** Map single vision-LLM TÜV extract → analyze API fields. */
export function tuevVisionToAnalyzeFields(
  extraction: TuevVisionExtraction,
): InvoiceTextParseResult {
  const { report, vendor, amount, lineItems } = extraction;
  const orgLabel =
    report.testingOrganization !== "other"
      ? report.testingOrganization
      : null;

  return normalizeTextParseResult({
    vendor,
    date: report.testDate,
    amount,
    category: "tuev",
    summary: "HU / AU Prüfbericht",
    lineItems,
    kbaNumber: null,
    vehicleApprovals: null,
    authority: orgLabel,
    conditions: null,
    partCategory: null,
    notes: null,
    manufacturer: null,
    invoiceNumber: report.documentNumber,
    mileageKm: report.mileageKm,
  });
}

export function buildTuevSystemPrompt(): string {
  return [
    "You are a strict data extractor for German HU/AU inspection reports (TÜV, DEKRA, GTÜ, KÜS).",
    "Read the uploaded document (PDF or scan) directly — no OCR preprocessing.",
    TUEV_PUNKT4_MILEAGE_GUIDANCE,
    TUEV_PUNKT6_DEFECTS_GUIDANCE,
    TUEV_PRUEFPUNKT_DOT_GUIDANCE,
    TUEV_ANTI_HALLUCINATION_GUIDANCE,
    "Extract testingOrganization, testDate (YYYY-MM-DD), result, mileageKm, nextInspectionDate (YYYY-MM),",
    "documentNumber, defectsTable, defectsList, vendor (Prüfstelle), amount (Gesamtgebühr EUR), lineItems (HU/AU fees).",
    "For each Punkt-6 defect: dot-separated checkpoint (e.g. 4.2.1, 1.3.2a), description (verbatim), severity EM or GM when shown.",
    "Map German result wording:",
    '- "ohne Mängel" / "mangelfrei" → no_defects',
    '- "geringfügige Mängel" → minor_defects',
    '- "erhebliche Mängel" → major_defects',
    '- "gefährliche Mängel" → dangerous_defects',
    '- "nicht bestanden" → failed',
    "Return ONLY valid JSON matching the schema.",
  ].join(" ");
}

export type TuevExtractionOptions = {
  model?: string;
};

export class TuevExtractionService {
  async extractFromDocument(
    input: DocumentBytesInput,
    options: TuevExtractionOptions = {},
  ): Promise<TuevVisionExtraction> {
    const model = options.model?.trim() || resolveParseModel("tuev");

    let client: OpenAI;
    let resolvedModel: string;
    try {
      ({ client, model: resolvedModel } = getOcrLlmClient({ model }));
    } catch (error) {
      throw new TextParseError(
        error instanceof Error ? error.message : "LLM client is not configured.",
      );
    }

    const userContent = buildDocumentUserMessage(
      [
        "German HU/AU inspection report (TÜV-Bericht). Read the document directly.",
        "Punkt 4 / Feld 4 / (4): Kilometerstand → mileageKm.",
        "Punkt 6 / Abschnitt 6: Festgestellte Mängel → defectsTable + defectsList (null wenn mangelfrei).",
        "Extract Prüforganisation, Prüfdatum, Ergebnis, nächste HU, Vorgangsnummer, Prüfgebühren (amount, lineItems), Prüfstelle (vendor).",
        "Prüfpunkte punktgetrennt (4.2.1, 1.3.2a). Keine Mängel erfinden.",
      ],
      input,
    );

    let completion: OpenAI.Chat.Completions.ChatCompletion;
    try {
      completion = await client.chat.completions.create({
        model: resolvedModel,
        max_completion_tokens: TUEV_MAX_TOKENS,
        response_format: {
          type: "json_schema",
          json_schema: TUEV_JSON_SCHEMA,
        },
        messages: [
          { role: "system", content: buildTuevSystemPrompt() },
          { role: "user", content: userContent },
        ],
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "LLM request failed.";
      throw new TextParseError(`TÜV extract failed: ${message}`);
    }

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new TextParseError("TÜV extract returned an empty response.");
    }

    let parsedJson: unknown;
    try {
      parsedJson = extractJsonObject(content);
    } catch {
      throw new TextParseError("TÜV extract returned invalid JSON.");
    }

    const record =
      typeof parsedJson === "object" && parsedJson !== null
        ? (parsedJson as Record<string, unknown>)
        : {};

    const sanitized = sanitizeTuevPayload(record);
    const parsed = TuevReportSchema.safeParse(sanitized);
    if (!parsed.success) {
      throw new TextParseError(
        "TÜV extract payload failed schema validation.",
      );
    }

    const vendor =
      typeof record.vendor === "string" && record.vendor.trim()
        ? record.vendor.trim().slice(0, 160)
        : null;
    const amount =
      typeof record.amount === "number" && Number.isFinite(record.amount)
        ? record.amount
        : null;
    const lineItems = Array.isArray(record.lineItems)
      ? (record.lineItems as InvoiceLineItem[])
      : null;

    return {
      report: parsed.data,
      vendor,
      amount,
      lineItems,
    };
  }
}

export const tuevExtractionService = new TuevExtractionService();
