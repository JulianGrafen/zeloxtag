import type OpenAI from "openai";

import { extractJsonObject } from "@/lib/ocr/json-from-llm";
import { getOcrLlmClient } from "@/lib/ocr/llm-client";
import { resolveParseModel } from "@/lib/ocr/model-routing";
import { TextParseError } from "@/lib/ocr/parse-error";
import { buildTuevDocumentUserMessage } from "@/lib/ocr/tuev-document-content";
import type { DocumentBytesInput } from "@/lib/ocr/llm-document-content";
import type { PreprocessedTuevDocument } from "@/services/documents/PdfPreprocessor";
import {
  normalizeTextParseResult,
  type InvoiceLineItem,
  type InvoiceTextParseResult,
} from "@/lib/ocr/text-parse-schema";
import {
  TUEV_RESULTS,
  TESTING_ORGANIZATIONS,
  type TestingOrganization,
  type TuevDefectRow,
  type TuevReport,
  type TuevResult,
} from "@/lib/validations/documentSchemas";
import {
  parseTuevReportLenient,
  sanitizeTuevPayload,
} from "@/services/documents/TuevReportService";

const TUEV_MAX_TOKENS = 2_400;

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

export const TUEV_PUNKT6_TABLE_GUIDANCE =
  "Punkt 6 Mängel often appear as dense tables or markdown-like rows (Prüfpunkt | Mangel | EM/GM). " +
  "If the table spans multiple rows or uses compact formatting, extract EVERY row sequentially into defectsTable. " +
  "Do not truncate, merge, or summarize defects. When unsure about a row, include it rather than omit it.";

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
  requiresManualReview: boolean;
};

/** Step 1 extraction: header fields only (no defects). */
export type TuevHeaderExtraction = {
  testingOrganization: TestingOrganization;
  testDate: string | null;
  result: TuevResult;
  mileageKm: number | null;
  nextInspectionDate: string | null;
  documentNumber: string | null;
  vendor: string | null;
  amount: number | null;
  lineItems: InvoiceLineItem[] | null;
  requiresManualReview: boolean;
};

/** Step 2 extraction: Punkt-6 defects only. */
export type TuevDefectsExtraction = {
  defectsTable: TuevDefectRow[] | null;
  defectsList: string[] | null;
};

/**
 * Overview extraction: testing organization and Prüfgebühr from a full-doc photo.
 * Extracted separately so the LLM can focus on letterhead + fee table.
 */
export type TuevOverviewExtraction = {
  testingOrganization: TestingOrganization;
  vendor: string | null;
  amount: number | null;
  lineItems: InvoiceLineItem[] | null;
};

const TUEV_LINE_ITEM_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["label", "amount"],
  properties: {
    label: { type: "string" },
    amount: { type: "number" },
  },
} as const;

/**
 * Header-only schema for wizard Step 1.
 * Deliberately omits defectsTable/defectsList so the LLM focuses on the header.
 */
const TUEV_HEADER_JSON_SCHEMA = {
  name: "tuev_header_extraction",
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
      "vendor",
      "amount",
      "lineItems",
    ],
    properties: {
      testingOrganization: { type: "string", enum: [...TESTING_ORGANIZATIONS] },
      testDate: {
        type: ["string", "null"],
        description: "Untersuchungsdatum as YYYY-MM-DD.",
      },
      result: { type: "string", enum: [...TUEV_RESULTS] },
      mileageKm: {
        type: ["integer", "null"],
        description:
          "Kilometerstand from Punkt 4 / Feld 4 / (4) or document header as whole number.",
      },
      nextInspectionDate: {
        type: ["string", "null"],
        description: "Nächste HU as YYYY-MM.",
      },
      documentNumber: {
        type: ["string", "null"],
        description: "Vorgangsnummer.",
      },
      vendor: {
        type: ["string", "null"],
        description: "Prüfstelle / Filiale name.",
      },
      amount: {
        type: ["number", "null"],
        description: "Gesamt-Prüfgebühr EUR.",
      },
      lineItems: {
        type: ["array", "null"],
        description: "Einzelne Gebührenposten (HU, AU, …).",
        items: TUEV_LINE_ITEM_SCHEMA,
      },
    },
  },
} as const;

/**
 * Defects-only schema for wizard Step 2.
 * Focused exclusively on Punkt 6 — no other fields.
 */
const TUEV_DEFECTS_ONLY_JSON_SCHEMA = {
  name: "tuev_defects_extraction",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["defectsTable", "defectsList"],
    properties: {
      defectsTable: {
        type: ["array", "null"],
        description:
          "All Mängel rows from Punkt 6 — checkpoint (dot-separated, e.g. 4.2.1, 1.3.2a), description (verbatim), severity EM/GM. Null when no defects.",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["checkpoint", "description", "severity"],
          properties: {
            checkpoint: {
              type: ["string", "null"],
              description: "Dot-separated Prüfpunkt exactly as printed.",
            },
            description: {
              type: "string",
              description: "Verbatim Mangel description.",
            },
            severity: {
              type: ["string", "null"],
              enum: ["EM", "GM", null],
              description: "EM or GM when shown; null otherwise.",
            },
          },
        },
      },
      defectsList: {
        type: ["array", "null"],
        description:
          "Plain-text list of all defects from Punkt 6. Null when no defects.",
        items: { type: "string" },
      },
    },
  },
} as const;

/**
 * Overview schema: organization + Prüfgebühr only.
 * Used for the full-document photo captured in wizard Step 1.
 */
const TUEV_OVERVIEW_JSON_SCHEMA = {
  name: "tuev_overview_extraction",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["testingOrganization", "vendor", "amount", "lineItems"],
    properties: {
      testingOrganization: {
        type: "string",
        enum: ["TÜV", "DEKRA", "GTÜ", "KÜS", "other"],
        description:
          "Brand shown on letterhead or logo. Use 'other' when none match.",
      },
      vendor: {
        type: ["string", "null"],
        description:
          "Exact printed name of the testing station / Prüfstelle / Prüfbetrieb. Null when not readable.",
      },
      amount: {
        type: ["number", "null"],
        description:
          "Total Prüfgebühr / Gesamtbetrag in EUR as a decimal number. Null when not visible.",
      },
      lineItems: {
        type: ["array", "null"],
        description:
          "Individual fee positions if a fee breakdown is shown. Null otherwise.",
        items: TUEV_LINE_ITEM_SCHEMA,
      },
    },
  },
} as const;

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
    notes: extraction.requiresManualReview
      ? "Manuelle Prüfung empfohlen — einige Felder konnten nicht zuverlässig gelesen werden."
      : null,
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
    TUEV_PUNKT6_TABLE_GUIDANCE,
    TUEV_PRUEFPUNKT_DOT_GUIDANCE,
    TUEV_ANTI_HALLUCINATION_GUIDANCE,
    "Extract testingOrganization, testDate (YYYY-MM-DD), result, mileageKm, nextInspectionDate (YYYY-MM),",
    "documentNumber, defectsTable, defectsList, vendor (Prüfstelle), amount (Gesamtgebühr EUR), lineItems (HU/AU fees).",
    "For each Punkt-6 defect: dot-separated checkpoint (e.g. 4.2.1, 1.3.2a), description (verbatim), severity EM or GM when shown.",
    "Optional fields (documentNumber, testDate, mileageKm, nextInspectionDate) → null when unreadable — never guess.",
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
  /** Step 1: extract header fields only (no defects). Used by the guided wizard. */
  async extractHeaderFromDocument(
    input: DocumentBytesInput,
    options: TuevExtractionOptions = {},
  ): Promise<TuevHeaderExtraction> {
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

    const systemPrompt = [
      "You are a strict data extractor for German HU/AU inspection reports (TÜV, DEKRA, GTÜ, KÜS).",
      "Focus ONLY on the document HEADER and result section — do NOT extract Punkt 6 defects.",
      TUEV_PUNKT4_MILEAGE_GUIDANCE,
      "Extract: testingOrganization, testDate (YYYY-MM-DD), result (map German wording below),",
      "mileageKm, nextInspectionDate (YYYY-MM), documentNumber, vendor (Prüfstelle), amount (Gesamtgebühr EUR), lineItems.",
      'Map result: "ohne Mängel"/"mangelfrei" → no_defects, "geringfügige Mängel" → minor_defects,',
      '"erhebliche Mängel" → major_defects, "gefährliche Mängel" → dangerous_defects, "nicht bestanden" → failed.',
      "Optional fields → null when unreadable — never guess. Return ONLY valid JSON.",
    ].join(" ");

    const userContent = await buildTuevDocumentUserMessage(
      [
        "TÜV/HU inspection report — extract HEADER fields only.",
        "Focus: Kopf (top), Punkt 1–4 (Ergebnis, Datum, Kilometerstand, Nächste HU).",
        "Ignore Punkt 6 (Mängel) — leave defects for a separate scan.",
      ],
      input,
    );

    let completion: OpenAI.Chat.Completions.ChatCompletion;
    try {
      completion = await client.chat.completions.create({
        model: resolvedModel,
        max_completion_tokens: 800,
        response_format: {
          type: "json_schema",
          json_schema: TUEV_HEADER_JSON_SCHEMA,
        },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "LLM request failed.";
      throw new TextParseError(`TÜV header extract failed: ${message}`);
    }

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new TextParseError("TÜV header extract returned an empty response.");
    }

    let parsedJson: unknown;
    try {
      parsedJson = extractJsonObject(content);
    } catch {
      throw new TextParseError("TÜV header extract returned invalid JSON.");
    }

    const record =
      typeof parsedJson === "object" && parsedJson !== null
        ? (parsedJson as Record<string, unknown>)
        : {};

    const testingOrg = (TESTING_ORGANIZATIONS as readonly string[]).includes(
      String(record.testingOrganization),
    )
      ? (record.testingOrganization as TestingOrganization)
      : "other";

    const result = (TUEV_RESULTS as readonly string[]).includes(
      String(record.result),
    )
      ? (record.result as TuevResult)
      : "no_defects";

    const testDate =
      typeof record.testDate === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(record.testDate)
        ? record.testDate
        : null;

    const mileageKm =
      typeof record.mileageKm === "number" &&
      Number.isFinite(record.mileageKm) &&
      record.mileageKm >= 0
        ? Math.round(record.mileageKm)
        : null;

    const nextInspectionDate =
      typeof record.nextInspectionDate === "string" &&
      /^\d{4}-\d{2}$/.test(record.nextInspectionDate)
        ? record.nextInspectionDate
        : null;

    const documentNumber =
      typeof record.documentNumber === "string" && record.documentNumber.trim()
        ? record.documentNumber.trim().slice(0, 120)
        : null;

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
      testingOrganization: testingOrg,
      testDate,
      result,
      mileageKm,
      nextInspectionDate,
      documentNumber,
      vendor,
      amount,
      lineItems,
      requiresManualReview: !testDate || !mileageKm,
    };
  }

  /** Step 2: extract Punkt-6 defects only. Used by the guided wizard. */
  async extractDefectsFromDocument(
    input: DocumentBytesInput,
    options: TuevExtractionOptions = {},
  ): Promise<TuevDefectsExtraction> {
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

    const systemPrompt = [
      "You are a strict data extractor for German HU/AU inspection reports.",
      "Focus EXCLUSIVELY on Punkt 6 / Abschnitt 6 (Festgestellte Mängel) of this document.",
      TUEV_PUNKT6_DEFECTS_GUIDANCE,
      TUEV_PUNKT6_TABLE_GUIDANCE,
      TUEV_PRUEFPUNKT_DOT_GUIDANCE,
      TUEV_ANTI_HALLUCINATION_GUIDANCE,
      "Extract every defect row sequentially — do not truncate or summarize.",
      "Return ONLY valid JSON.",
    ].join(" ");

    const userContent = await buildTuevDocumentUserMessage(
      [
        "TÜV/HU inspection report — extract DEFECTS only from Punkt 6.",
        "Look for 'Festgestellte Mängel', 'Abschnitt 6', numbered Prüfpunkt rows.",
        "If no defects are listed (mangelfrei), return null for both fields.",
      ],
      input,
    );

    let completion: OpenAI.Chat.Completions.ChatCompletion;
    try {
      completion = await client.chat.completions.create({
        model: resolvedModel,
        max_completion_tokens: 1_800,
        response_format: {
          type: "json_schema",
          json_schema: TUEV_DEFECTS_ONLY_JSON_SCHEMA,
        },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "LLM request failed.";
      throw new TextParseError(`TÜV defects extract failed: ${message}`);
    }

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new TextParseError("TÜV defects extract returned an empty response.");
    }

    let parsedJson: unknown;
    try {
      parsedJson = extractJsonObject(content);
    } catch {
      throw new TextParseError("TÜV defects extract returned invalid JSON.");
    }

    const record =
      typeof parsedJson === "object" && parsedJson !== null
        ? (parsedJson as Record<string, unknown>)
        : {};

    const defectsTable =
      Array.isArray(record.defectsTable) && record.defectsTable.length > 0
        ? (record.defectsTable as TuevDefectRow[])
        : null;

    const defectsList =
      Array.isArray(record.defectsList) && record.defectsList.length > 0
        ? (record.defectsList as string[])
        : null;

    return { defectsTable, defectsList };
  }

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

    const userContent = await buildTuevDocumentUserMessage(
      [
        "German HU/AU inspection report (TÜV-Bericht). Read the document directly.",
        "Focus on page 1 (and page 2 if Punkt 6 continues): Kopf, Punkt 4 (KM-Stand), Punkt 6 (Mängel table row-by-row).",
        "If Punkt 6 uses a dense table, extract every row sequentially — do not truncate.",
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
    const { report, requiresManualReview } = parseTuevReportLenient(sanitized);

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
      report: {
        ...report,
        requiresManualReview: requiresManualReview || undefined,
      },
      vendor,
      amount,
      lineItems,
      requiresManualReview,
    };
  }

  /**
   * Overview extraction: testing organization + Prüfgebühr from a full-document photo.
   *
   * Used as wizard Step 1 — the user photographs the entire report so the LLM
   * can read the letterhead logo and the fee table at the bottom without having
   * to parse the dense header section at the same time.
   */
  async extractOverviewFromDocument(
    input: DocumentBytesInput,
    options: TuevExtractionOptions = {},
  ): Promise<TuevOverviewExtraction> {
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

    const systemPrompt = [
      "You extract testing organization and Prüfgebühr from a German HU/AU vehicle inspection report photo.",
      "",
      "LOOK FOR:",
      "1. testingOrganization — the brand on the letterhead or logo (TÜV, DEKRA, GTÜ, KÜS, or 'other').",
      "2. vendor — exact printed name of the testing station / Prüfstelle (e.g. 'TÜV Süd Service-Center München').",
      "3. amount — the total Prüfgebühr / Gesamtbetrag in EUR (look for 'Gesamtbetrag', 'Summe', 'Prüfgebühr', 'Gesamt').",
      "4. lineItems — individual fee rows if a breakdown is printed (label + amount).",
      "",
      "IGNORE: dates, mileage, defects, test results, vehicle VIN — these are extracted separately.",
      "NEVER hallucinate. Return null for any field you cannot read clearly.",
    ].join("\n");

    const userContent = await buildTuevDocumentUserMessage(
      ["Please extract the testing organization and Prüfgebühr from this full document photo."],
      input,
    );

    let completion: OpenAI.Chat.Completions.ChatCompletion;
    try {
      completion = await client.chat.completions.create({
        model: resolvedModel,
        max_completion_tokens: 600,
        response_format: {
          type: "json_schema",
          json_schema: TUEV_OVERVIEW_JSON_SCHEMA,
        },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "LLM request failed.";
      throw new TextParseError(`TÜV overview extract failed: ${message}`);
    }

    const raw = extractJsonObject(completion.choices[0]?.message?.content ?? "");
    if (!raw) throw new TextParseError("LLM returned no JSON for overview extraction.");

    const isRecord = (v: unknown): v is Record<string, unknown> =>
      typeof v === "object" && v !== null && !Array.isArray(v);

    const org = isRecord(raw) ? raw["testingOrganization"] : undefined;
    const vendorRaw = isRecord(raw) ? (raw["vendor"] as string | null) : null;
    const amountRaw = isRecord(raw) ? raw["amount"] : null;
    const lineItemsRaw = isRecord(raw) ? raw["lineItems"] : null;

    const validOrgs = ["TÜV", "DEKRA", "GTÜ", "KÜS", "other"] as const;
    const testingOrganization: TestingOrganization =
      validOrgs.includes(org as (typeof validOrgs)[number])
        ? (org as TestingOrganization)
        : "other";

    const vendor =
      typeof vendorRaw === "string" && vendorRaw.trim() ? vendorRaw.trim() : null;
    const amount =
      typeof amountRaw === "number" && Number.isFinite(amountRaw) && amountRaw > 0
        ? amountRaw
        : null;
    const lineItems = Array.isArray(lineItemsRaw)
      ? (lineItemsRaw as InvoiceLineItem[])
      : null;

    return { testingOrganization, vendor, amount, lineItems };
  }

  /**
   * Single-shot extraction from pre-processed pages (one-click upload flow).
   *
   * - Single page / image → runs full extraction via `extractFromDocument`.
   * - Multi-page → runs header extraction on page 1 + defects extraction on
   *   page 2 in parallel, then merges into a single `TuevVisionExtraction`.
   */
  async extractFromPreprocessedDocument(
    preprocessed: PreprocessedTuevDocument,
    options: TuevExtractionOptions = {},
  ): Promise<TuevVisionExtraction> {
    const headerInput: DocumentBytesInput = {
      bytes: preprocessed.headerPage,
      contentType: "image/png",
    };

    if (!preprocessed.defectsPage) {
      // Single-page document or image — full extraction on the one page.
      return this.extractFromDocument(headerInput, options);
    }

    // Multi-page — run both step extractions in parallel for speed.
    const defectsInput: DocumentBytesInput = {
      bytes: preprocessed.defectsPage,
      contentType: "image/png",
    };

    const [headerResult, defectsResult] = await Promise.all([
      this.extractHeaderFromDocument(headerInput, options),
      this.extractDefectsFromDocument(defectsInput, options).catch(
        (): TuevDefectsExtraction => ({ defectsTable: null, defectsList: null }),
      ),
    ]);

    const requiresManualReview =
      headerResult.requiresManualReview || !headerResult.testDate;

    const report: TuevReport = {
      testingOrganization: headerResult.testingOrganization,
      testDate: headerResult.testDate,
      result: headerResult.result,
      mileageKm: headerResult.mileageKm,
      nextInspectionDate: headerResult.nextInspectionDate,
      documentNumber: headerResult.documentNumber,
      defectsTable: defectsResult.defectsTable,
      defectsList: defectsResult.defectsList,
      requiresManualReview: requiresManualReview || undefined,
    };

    return {
      report,
      vendor: headerResult.vendor,
      amount: headerResult.amount,
      lineItems: headerResult.lineItems,
      requiresManualReview,
    };
  }
}

export const tuevExtractionService = new TuevExtractionService();
