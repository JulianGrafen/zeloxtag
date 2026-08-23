import type OpenAI from "openai";

import { extractJsonObject } from "@/lib/ocr/json-from-llm";
import {
  analyzeLayoutWithAzure,
  isAzureDocumentIntelligenceConfigured,
} from "@/lib/ocr/azure-document-intelligence";
import { getOcrLlmClient } from "@/lib/ocr/llm-client";
import { resolveParseModel } from "@/lib/ocr/model-routing";
import { TextParseError } from "@/lib/ocr/parse-error";
import { buildTuevDocumentUserMessage } from "@/lib/ocr/tuev-document-content";
import {
  normalizeTuevLineItems,
  parseTuevAmountValue,
  resolveTuevTotalAmount,
} from "@/lib/ocr/tuev-amount";
import { preferTuevTotalAmount } from "@/lib/ocr/tuev-amount-from-text";
import {
  enrichTuevRecordFromOcrText,
  enrichTuevSanitizedFromOcrText,
} from "@/lib/ocr/tuev-enrichment";
import { preferTuevMileageKm } from "@/lib/ocr/tuev-mileage-from-text";
import { preferTuevNextInspectionDate } from "@/lib/ocr/tuev-next-inspection-from-text";
import { preferTuevTestDate } from "@/lib/ocr/tuev-test-date-from-text";
import { normalizeTuevOcrText } from "@/lib/ocr/tuev-ocr-normalize";
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

/**
 * Checkpoint number rules — strictly verbatim, D-prefix preserved.
 *
 * Key observations from real TÜV/DEKRA reports:
 * - Checkpoints can have 2-4 dot-separated segments: "1.1.13a", "5.3.1b", "2.6d"
 * - Some checkpoints are prefixed with capital 'D': "D5.2.3a", "D5.2.3c"
 * - A space before the letter suffix is a printing artefact: "5.3.1 b" → "5.3.1b"
 */
export const TUEV_PRUEFPUNKT_DOT_GUIDANCE =
  "PRÜFPUNKT CHECKPOINT RULES (critical — read carefully):\n" +
  "1. Copy the checkpoint number EXACTLY as printed — count every digit and dot: '1.1.13a' has 2 dots and 4 parts.\n" +
  "2. Some checkpoints have a capital 'D' prefix (e.g. 'D5.2.3a', 'D5.2.3c'). The 'D' is MANDATORY — never drop it.\n" +
  "3. DO NOT confuse the capital 'D' prefix with a lowercase 'd' letter suffix: 'D5.2.3c' ≠ '5.2.3d'.\n" +
  "4. If a letter (a/b/c/d) follows the last digit with a space (e.g. '5.3.1 b'), strip the space → '5.3.1b'.\n" +
  "5. NEVER add, remove, or merge digits — '1.1.13a' stays '1.1.13a', not '1.13a' or '1.1.1.13a'.";

/** Kilometerstand is under Punkt 4 / Feld 4, also sometimes in the document header. */
export const TUEV_PUNKT4_MILEAGE_GUIDANCE =
  "KILOMETERSTAND (mileageKm): ALWAYS from Punkt 4 / Feld 4 / (4) — the ONLY standard field for odometer on HU/AU forms.\n" +
  "Labels (often split across OCR lines): '(4) Stand Wegstreckenzähler', '(4) km-St.', '(4)Km-St.', '4. Kilometerstand', " +
  "'Punkt 4', 'Feld 4', 'KM-Stand', 'Km-St.', 'Wegstreckenzähler', 'Kilometerstand', 'Tachostand'.\n" +
  "TÜV Rheinland: '(4) Stand Wegstreckenzähler' with value on same or next line (e.g. '294 683').\n" +
  "DEKRA: '(4)' + 'km-St.' on separate lines, value on the line after (e.g. '178605').\n" +
  "Read ALL digits carefully — 6–7 digits are common. Strip thousand separators (. or space).\n" +
  "Examples: '294.683 km' → 294683, '178 605' → 178605, '(4)Km-St. 178605' → 178605.\n" +
  "Do NOT use Erstzulassung, Rechnungs-KM or workshop invoice mileage — Punkt 4 only.";

/**
 * testDate = Prüfdatum — ALWAYS from Punkt 3 / Feld 3 / (3) Prüftermin only.
 * Must NOT be confused with Erstzulassung, Letzte HU, or nächste HU.
 */
export const TUEV_PUNKT3_PRUEFDATUM_GUIDANCE =
  "PRÜFDATUM (testDate): IMMER ausschließlich aus Punkt 3 / Feld 3 / (3) Prüftermin extrahieren.\n" +
  "Das ist die EINZIGE erlaubte Quelle — keine Fallbacks, keine anderen Datumsfelder.\n" +
  "Labels: '3. Prüftermin', 'Punkt 3', 'Feld 3', '(3) Prüftermin', '(3)Prüftermin', '(3) Prüfort', 'Prüfungsdatum', 'Untersuchungsdatum'.\n" +
  "  TÜV Rheinland/FSP: '(3) Prüftermin: 26.01.2026, 10:21 Uhr' → 2026-01-26\n" +
  "  DEKRA: '(3)Prüfort: Mechernich, 23.03.2021' or '(3) Prüfort Mechernich, 23.03.2021' → 2021-03-23\n" +
  "NIEMALS verwenden (auch wenn lesbar):\n" +
  "  - 'Erstzulassung' / 'EZ' / 'Erstzulassungsdatum'\n" +
  "  - 'Letzte HU' / 'Dat.letzt.HU' / 'zuletzt geprüft'\n" +
  "  - 'nächste HU' / 'Nächste Untersuchung' / 'spätestens bis' / 'Nachuntersuchung bis'\n" +
  "  - 'Hauptuntersuchung vom', 'Leistungsdatum', 'HU-Datum', Fußzeilen-/Stempeldaten\n" +
  "  - Dokumenttitel, Formularversion, Fristen aus Punkt 8\n" +
  "Output: YYYY-MM-DD. Wenn Punkt 3 nicht lesbar → null (nicht raten).";

/** @deprecated Use TUEV_PUNKT3_PRUEFDATUM_GUIDANCE */
export const TUEV_PRUEFTERMIN_GUIDANCE = TUEV_PUNKT3_PRUEFDATUM_GUIDANCE;

export const TUEV_PUNKT6_TABLE_GUIDANCE =
  "MÄNGEL TABLE FORMATS:\n" +
  "Format A (TÜV Rheinland/FSP): single line per entry: 'checkpoint – EM/GM – description'\n" +
  "  e.g. '1.1.13a – EM – Bremsbelag 2. Achse rechts verschlissen'\n" +
  "Format B (DEKRA): TWO lines per entry:\n" +
  "  Line 1: '-[checkpoint] ([severity])' e.g. '-D5.2.3c (EM)'\n" +
  "  Line 2: description e.g. 'M+S Reifen Geschwindigkeitsschild fehlt'\n" +
  "  → Extract: checkpoint='D5.2.3c' (strip hyphen and parentheses!), severity='EM', description=line2.\n" +
  "  CRITICAL: The '(EM)' or '(GM)' on the checkpoint line is the severity — do NOT include it in checkpoint string.\n" +
  "Extract EVERY row sequentially. Do not truncate or summarize.";

export const TUEV_PREIS_GUIDANCE =
  "PRÜFGEBÜHR (amount): Extract the TOTAL fee the customer pays — bottom line including VAT.\n" +
  "WHERE TO LOOK (document footer / Entgeltinformation / Rechnungsfuß):\n" +
  "  TÜV Rheinland/FSP: table 'Entgeltinformation' → 'Gesamt: 171,90 inkl. USt.' → amount=171.9\n" +
  "    NOT the 'Prüfungsentgelt' row alone (165,71) — that excludes Vorgaben/Vergütung.\n" +
  "  DEKRA: bottom-right 'Gesamtbetrag inkl. MwSt: 125,00 EUR' → amount=125.0\n" +
  "    NOT 'Hauptuntersuchung' 123,81 alone — add Sonstiges/Vorgaben (1,19).\n" +
  "  GTÜ/KÜS: 'Gesamt', 'Summe', 'Gesamtbetrag', 'zu zahlen'.\n" +
  "When lineItems (fee breakdown) are visible: list every row AND set amount to the Gesamt total.\n" +
  "German decimal: comma = decimal point (125,00 → 125.0). Null only when fee section is invisible.";

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
        description:
          "Prüfdatum as YYYY-MM-DD — ALWAYS from Punkt 3 / Feld 3 / (3) Prüftermin only. " +
          "No other date fields. Null when Punkt 3 is unreadable.",
      },
      result: {
        type: "string",
        enum: [...TUEV_RESULTS],
      },
      mileageKm: {
        type: ["integer", "null"],
        description:
          "Kilometerstand from Punkt 4 / Feld 4 / (4) ONLY — whole number, all digits. " +
          "Labels: (4) Stand Wegstreckenzähler, (4) km-St., 4. Kilometerstand, KM-Stand, Wegstreckenzähler. " +
          "Value may be on the line after the label. Null when Punkt 4 unreadable.",
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
                "Prüfpunkt number from Punkt 6 — COPY VERBATIM including every digit and dot. " +
                "Examples: '1.1.13a', '1.1.14a', '5.3.1b', '5.3.1d', 'D5.2.3a', 'D5.2.3c', '2.6b', '2.6d'. " +
                "Capital 'D' prefix MUST be kept (D5.2.3a ≠ 5.2.3a). " +
                "Strip spaces before letter suffix (e.g. '5.3.1 b' → '5.3.1b'). " +
                "NEVER add or remove digits. Null only when truly absent.",
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
        description:
          "The TOTAL inspection fee in EUR — always the bottom-line sum including VAT. " +
          "Preferred source labels: 'Gesamt', 'Gesamtbetrag inkl. MwSt', 'Gesamtbetrag inkl. 19 % MwSt', 'Prüfungsentgelt gesamt'. " +
          "Examples: 'Gesamt: 171,90 inkl. USt.' → 171.9; 'Gesamtbetrag inkl. MwSt: 125,00 EUR' → 125.0. " +
          "NEVER use line-item prices like 'Hauptuntersuchung 123,81' — those are partial fees. " +
          "German decimal: comma = decimal point (125,00 → 125.0). Null only when fee section is not visible.",
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
        description:
          "Prüfdatum as YYYY-MM-DD — ALWAYS from Punkt 3 / Feld 3 / (3) Prüftermin only. " +
          "No other date fields. Null when Punkt 3 is unreadable.",
      },
      result: { type: "string", enum: [...TUEV_RESULTS] },
      mileageKm: {
        type: ["integer", "null"],
        description:
          "Kilometerstand from Punkt 4 / Feld 4 / (4) ONLY — whole number, all digits. " +
          "Labels: (4) Stand Wegstreckenzähler, (4) km-St., Wegstreckenzähler, KM-Stand.",
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
        description:
          "TOTAL Prüfgebühr in EUR incl. VAT — Gesamtbetrag / Gesamt row only, not HU line item alone.",
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
              description:
                "Prüfpunkt number EXACTLY as printed — copy verbatim, including all digits, dots, and capital 'D' prefix. " +
                "Examples: '1.1.13a', '1.1.14a', '5.3.1b', '5.3.1d', 'D5.2.3a', 'D5.2.3c'. " +
                "Strip spaces before letter suffix. NEVER add or remove digits.",
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
          "TOTAL Prüfgebühr in EUR incl. VAT — bottom-line Gesamtbetrag only. " +
          "TÜV: 'Gesamt … inkl. USt.' in Entgeltinformation. DEKRA: 'Gesamtbetrag inkl. MwSt'. " +
          "Never return a single line-item fee when Gesamt is visible. Null if fee section missing.",
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

function finalizeTuevFeeFields(
  amountRaw: unknown,
  lineItemsRaw: unknown,
  ocrText?: string | null,
): { amount: number | null; lineItems: InvoiceLineItem[] | null } {
  const lineItems = normalizeTuevLineItems(lineItemsRaw);
  const amount = ocrText?.trim()
    ? preferTuevTotalAmount(parseTuevAmountValue(amountRaw), lineItems, ocrText)
    : resolveTuevTotalAmount(parseTuevAmountValue(amountRaw), lineItems);
  return { amount, lineItems };
}

async function loadTuevOcrText(
  input: DocumentBytesInput,
): Promise<string | null> {
  if (!isAzureDocumentIntelligenceConfigured()) return null;
  try {
    const layout = await analyzeLayoutWithAzure(input.bytes, input.contentType);
    const content = layout?.content?.trim();
    if (!content || content.length < 20) return null;
    return normalizeTuevOcrText(content);
  } catch {
    return null;
  }
}

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
    "",
    TUEV_PUNKT3_PRUEFDATUM_GUIDANCE,
    "",
    TUEV_PUNKT4_MILEAGE_GUIDANCE,
    "",
    TUEV_PREIS_GUIDANCE,
    "",
    TUEV_PUNKT6_DEFECTS_GUIDANCE,
    TUEV_PUNKT6_TABLE_GUIDANCE,
    "",
    TUEV_PRUEFPUNKT_DOT_GUIDANCE,
    "NOTE: Checkpoint number segments CAN be 2+ digits (e.g. '1.1.13a' — third segment is '13', not '3').",
    "      Read every digit carefully. '1.1.13a' has the sequence: 1 → 1 → 13 → a.",
    "",
    TUEV_ANTI_HALLUCINATION_GUIDANCE,
    "",
    "Extract: testingOrganization, testDate from Punkt 3 only (YYYY-MM-DD), result, mileageKm, nextInspectionDate (YYYY-MM),",
    "documentNumber, defectsTable, defectsList, vendor (Prüfstelle name), amount (Gesamtgebühr EUR), lineItems (HU/AU fee rows).",
    "",
    "Result mapping:",
    '  "ohne Mängel" / "mangelfrei" → no_defects',
    '  "geringfügige Mängel" → minor_defects',
    '  "erhebliche Mängel" → major_defects',
    '  "gefährliche Mängel" → dangerous_defects',
    '  "nicht bestanden" → failed',
    "",
    "Return ONLY valid JSON matching the schema.",
  ].join("\n");
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
      "",
      TUEV_PUNKT3_PRUEFDATUM_GUIDANCE,
      "",
      TUEV_PUNKT4_MILEAGE_GUIDANCE,
      "",
      TUEV_PREIS_GUIDANCE,
      "",
      "Extract: testingOrganization, testDate from Punkt 3 only (YYYY-MM-DD), result, mileageKm, nextInspectionDate (YYYY-MM),",
      "documentNumber, vendor (Prüfstelle name), amount (Gesamtgebühr EUR total incl. VAT), lineItems.",
      "",
      'Result mapping: "ohne Mängel"/"mangelfrei" → no_defects, "geringfügige Mängel" → minor_defects,',
      '"erhebliche Mängel" → major_defects, "gefährliche Mängel" → dangerous_defects, "nicht bestanden" → failed.',
      "",
      "Optional fields → null when unreadable — never guess. Return ONLY valid JSON.",
    ].join("\n");

    const userContent = await buildTuevDocumentUserMessage(
      [
        "TÜV/HU inspection report — extract HEADER fields only.",
        "Prüfdatum (testDate): ALWAYS from Punkt 3 / (3) Prüftermin — no other date source.",
        "Focus: Kopf (top), Punkt 3 (Prüfdatum), Punkt 4 (KM-Stand), Ergebnis, Nächste HU.",
        "Punkt 4 KM: read every digit at Punkt 4 / (4) — labels: Stand Wegstreckenzähler, km-St., KM-Stand, Wegstreckenzähler; value may be on the next line.",
        "Ignore Punkt 6 (Mängel) — leave defects for a separate scan.",
      ],
      input,
    );

    const ocrPromise = loadTuevOcrText(input);

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

    const ocrText = await ocrPromise;

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

    const testDate = preferTuevTestDate(
      typeof record.testDate === "string" ? record.testDate : null,
      ocrText ?? "",
    );

    const mileageKm = preferTuevMileageKm(
      typeof record.mileageKm === "number" &&
        Number.isFinite(record.mileageKm) &&
        record.mileageKm >= 0
        ? Math.round(record.mileageKm)
        : null,
      ocrText ?? "",
    );

    const nextInspectionDate = preferTuevNextInspectionDate(
      typeof record.nextInspectionDate === "string"
        ? record.nextInspectionDate
        : null,
      ocrText ?? "",
    );

    const documentNumber =
      typeof record.documentNumber === "string" && record.documentNumber.trim()
        ? record.documentNumber.trim().slice(0, 120)
        : null;

    const vendor =
      typeof record.vendor === "string" && record.vendor.trim()
        ? record.vendor.trim().slice(0, 160)
        : null;

    const { amount, lineItems } = finalizeTuevFeeFields(
      record.amount,
      record.lineItems,
      ocrText,
    );

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
    ].join("\n");

    const userContent = await buildTuevDocumentUserMessage(
      [
        "TÜV/HU inspection report — extract DEFECTS only from Punkt 6.",
        "Look for 'Festgestellte Mängel', 'Abschnitt 6', numbered Prüfpunkt rows.",
        "DEKRA: checkpoint on line 1 (-D5.2.3c (EM)), description on line 2.",
        "TÜV Rheinland: '1.1.13a – EM – description' on one line.",
        "If no defects are listed (mangelfrei), return null for both fields.",
      ],
      input,
    );

    const ocrPromise = loadTuevOcrText(input);

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

    const ocrText = await ocrPromise;

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

    const enriched = enrichTuevRecordFromOcrText(record, ocrText);

    const defectsTable =
      Array.isArray(enriched.defectsTable) && enriched.defectsTable.length > 0
        ? (enriched.defectsTable as TuevDefectRow[])
        : null;

    const defectsList =
      Array.isArray(enriched.defectsList) && enriched.defectsList.length > 0
        ? (enriched.defectsList as string[])
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
        "Prüfdatum (testDate): ALWAYS from Punkt 3 / (3) Prüftermin — never Erstzulassung, Letzte HU, or Nachuntersuchung.",
        "Focus on page 1 (and page 2 if Punkt 6 continues): Kopf, Punkt 3 (Prüfdatum), Punkt 4 (KM-Stand), Punkt 6 (Mängel row-by-row).",
        "If Punkt 6 uses a dense table, extract every row sequentially — do not truncate.",
        "Extract Prüforganisation, Prüfdatum (Punkt 3), Ergebnis, nächste HU, Vorgangsnummer, Prüfgebühren (amount, lineItems), Prüfstelle (vendor).",
        "Prüfgebühr: footer Entgeltinformation / Gesamtbetrag inkl. MwSt — Gesamt-Summe, nicht Einzelposition.",
        "",
        "CHECKPOINT EXAMPLES — copy each VERBATIM:",
        "  TÜV format '1.1.13a – EM – Bremsbelag 2. Achse rechts ...' → checkpoint='1.1.13a'",
        "    (third segment is THIRTEEN = 13, two digits; NOT '3' or '1'. Both '1.1.13a' Achse-rechts and Achse-links use '1.1.13a'.)",
        "  TÜV format '1.1.14a – EM – Bremsscheibe ...' → checkpoint='1.1.14a' (FOURTEEN = 14)",
        "  TÜV format '5.3.1b – EM – Feder ...' → checkpoint='5.3.1b' (letter 'b', may appear as '5.3.1 b' with space → strip space)",
        "  TÜV format '5.3.1d – EM – Feder ...' → checkpoint='5.3.1d' (letter 'd')",
        "  TÜV format 'D5.2.3a – GM – Reifen ...' → checkpoint='D5.2.3a' (capital D is prefix, NOT suffix — 'a' is suffix)",
        "  DEKRA format '-D5.2.3c (EM)' on line 1, 'M+S Reifen Geschwindigkeitsschild fehlt' on line 2:",
        "    → checkpoint='D5.2.3c' (capital D prefix, final letter is lowercase 'c' — NOT 'd'), severity='EM', description='M+S Reifen...'",
        "    CRITICAL: 'c' and 'd' look similar in print — 'D5.2.3c' ends with 'c' when the description mentions 'Geschwindigkeitsschild'.",
        "  DEKRA format '-5.2.3d (EM)' → checkpoint='5.2.3d' (no D prefix, lowercase 'd' suffix, Reifen Alterungsrisse)",
        "",
        "Keine Mängel erfinden.",
      ],
      input,
    );

    const ocrPromise = loadTuevOcrText(input);

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

    const ocrText = await ocrPromise;

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

    const enrichedRecord = enrichTuevRecordFromOcrText(record, ocrText);
    const sanitized = enrichTuevSanitizedFromOcrText(
      sanitizeTuevPayload(enrichedRecord),
      ocrText,
    );
    const { report, requiresManualReview } = parseTuevReportLenient(sanitized);

    const vendor =
      typeof record.vendor === "string" && record.vendor.trim()
        ? record.vendor.trim().slice(0, 160)
        : null;
    const { amount, lineItems } = finalizeTuevFeeFields(
      enrichedRecord.amount,
      enrichedRecord.lineItems,
      ocrText,
    );

    const needsReview =
      requiresManualReview || !report.testDate || report.mileageKm == null;

    return {
      report: {
        ...report,
        requiresManualReview: needsReview || undefined,
      },
      vendor,
      amount,
      lineItems,
      requiresManualReview: needsReview,
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
      TUEV_PREIS_GUIDANCE,
      "",
      "ALSO EXTRACT:",
      "1. testingOrganization — brand on letterhead/logo (TÜV, DEKRA, GTÜ, KÜS, or 'other').",
      "2. vendor — exact printed Prüfstelle name.",
      "3. lineItems — every fee row in the breakdown when visible.",
      "",
      "IGNORE: dates, mileage, defects, test results, VIN.",
      "NEVER hallucinate. Return null for unreadable fields.",
    ].join("\n");

    const userContent = await buildTuevDocumentUserMessage(
      [
        "Extract testing organization and Prüfgebühr from this full document photo.",
        "Focus on the footer: Entgeltinformation (TÜV) or Gesamtbetrag inkl. MwSt (DEKRA).",
        "amount must be the Gesamt total — not a single HU line item.",
      ],
      input,
    );

    const ocrPromise = loadTuevOcrText(input);

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

    const ocrText = await ocrPromise;

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
    const { amount, lineItems } = finalizeTuevFeeFields(
      amountRaw,
      lineItemsRaw,
      ocrText,
    );

    return { testingOrganization, vendor, amount, lineItems };
  }

  /**
   * Single-shot extraction from pre-processed pages.
   *
   * @deprecated Prefer wizard step APIs or `extractFromDocument` for one-shot.
   * Kept for potential internal tooling — not used by Single-Click upload.
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
