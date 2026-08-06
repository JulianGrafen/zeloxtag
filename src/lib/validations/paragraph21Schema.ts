import { z } from "zod";

import type { ApprovalFields } from "@/lib/documents/approval-fields";
import type { Einzelabnahme } from "@/lib/validations/documentSchemas";
import { normalizeTextParseResult } from "@/lib/ocr/text-parse-schema";
import type { InvoiceTextParseResult } from "@/lib/ocr/text-parse-schema";

/**
 * § 21 StVZO Einzelbetriebserlaubnis — fields for police traffic-stop checks.
 * Layout mirrors Fahrzeugschein grid fields (E, 2, D.3, 22).
 */

/** Thrown when Field E (Fahrgestellnummer) cannot be extracted. */
export class MissingVinError extends Error {
  constructor(
    message = "Feld E (Fahrgestellnummer) fehlt — §21-Dokument ohne VIN ist ungültig.",
  ) {
    super(message);
    this.name = "MissingVinError";
  }
}

/** Raw LLM payload — VIN may be null before normalization. */
export const Paragraph21LlmPayloadSchema = z
  .object({
    documentNumber: z.string().trim().min(1).max(120).nullable(),
    issueDate: z.string().trim().min(1).max(32).nullable(),
    /** Field E — Fahrgestellnummer. */
    vin: z.string().trim().min(1).max(32).nullable(),
    /** Field 2 — Hersteller. */
    manufacturer: z.string().trim().min(1).max(120).nullable(),
    /** Field D.3 — Handelsbezeichnung / Modell. */
    model: z.string().trim().min(1).max(120).nullable(),
    /** Field 22 — Bemerkungen / Änderungen (verbatim). */
    modificationsField22: z.string().trim().min(1).max(8_000).nullable(),
    additionalRemarks: z.string().trim().min(1).max(4_000).nullable(),
  })
  .strict();

export type Paragraph21LlmPayload = z.infer<typeof Paragraph21LlmPayloadSchema>;

/** Validated extraction — VIN is mandatory. */
export const Paragraph21ExtractionSchema = z
  .object({
    documentNumber: z.string().trim().min(1).max(120).nullable(),
    issueDate: z.string().trim().min(1).max(32).nullable(),
    vin: z.string().trim().min(5).max(32),
    manufacturer: z.string().trim().min(1).max(120).nullable(),
    model: z.string().trim().min(1).max(120).nullable(),
    modificationsField22: z.string().trim().min(1).max(8_000).nullable(),
    additionalRemarks: z.string().trim().min(1).max(4_000).nullable(),
  })
  .strict();

export type Paragraph21Extraction = z.infer<typeof Paragraph21ExtractionSchema>;

/** OpenAI strict JSON Schema — keep in sync with {@link Paragraph21LlmPayloadSchema}. */
export const PARAGRAPH_21_JSON_SCHEMA = {
  name: "paragraph21_extraction",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "documentNumber",
      "issueDate",
      "vin",
      "manufacturer",
      "model",
      "modificationsField22",
      "additionalRemarks",
    ],
    properties: {
      documentNumber: {
        type: ["string", "null"],
        description:
          'Document / approval number near the top, e.g. "0DE0CAL09MV009494".',
      },
      issueDate: {
        type: ["string", "null"],
        description: 'Issue date as printed, e.g. "12.04.2019".',
      },
      vin: {
        type: ["string", "null"],
        description:
          'Field E — Fahrgestellnummer (VIN). CRITICAL. e.g. "2TM000104".',
      },
      manufacturer: {
        type: ["string", "null"],
        description: 'Field 2 — Hersteller, e.g. "YAMAHA (J)".',
      },
      model: {
        type: ["string", "null"],
        description: 'Field D.3 — Modell / Handelsbezeichnung, e.g. "SRX 600".',
      },
      modificationsField22: {
        type: ["string", "null"],
        description:
          'Field 22 — Bemerkungen / Änderungen. Extract the ENTIRE block verbatim including asterisks and abbreviations. Do NOT summarize.',
      },
      additionalRemarks: {
        type: ["string", "null"],
        description:
          'Text under "Zusätzliche Bemerkungen zur Fahrzeugbeschreibung" if present.',
      },
    },
  },
} as const;

/** Normalize VIN for comparison (uppercase, no spaces). */
export function normalizeVin(value: string | null | undefined): string | null {
  if (!value) return null;
  const cleaned = value.trim().replace(/\s+/g, "").toUpperCase();
  if (cleaned.length < 5) return null;
  return cleaned.slice(0, 32);
}

/**
 * §21 documents are vehicle-specific — extracted VIN must match the garage twin.
 */
export function verifyVehicleMatch(
  extractedVin: string,
  userGarageVin: string,
): boolean {
  const extracted = normalizeVin(extractedVin);
  const garage = normalizeVin(userGarageVin);
  if (!extracted || !garage) return false;
  return extracted === garage;
}

function normalizeOptionalText(
  value: string | null | undefined,
  max: number,
): string | null {
  if (!value) return null;
  const trimmed = value.trim().replace(/\s+/g, " ").slice(0, max);
  return trimmed.length > 0 ? trimmed : null;
}

/** Preserve Field 22 verbatim — only trim outer whitespace. */
function normalizeField22(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim().slice(0, 8_000);
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeParagraph21Extraction(
  fields: Paragraph21LlmPayload,
): Paragraph21Extraction {
  const vin = normalizeVin(fields.vin);
  if (!vin) {
    throw new MissingVinError();
  }

  const normalized: Paragraph21Extraction = {
    documentNumber: normalizeOptionalText(fields.documentNumber, 120),
    issueDate: normalizeOptionalText(fields.issueDate, 32),
    vin,
    manufacturer: normalizeOptionalText(fields.manufacturer, 120),
    model: normalizeOptionalText(fields.model, 120),
    modificationsField22: normalizeField22(fields.modificationsField22),
    additionalRemarks: normalizeOptionalText(fields.additionalRemarks, 4_000),
  };

  return Paragraph21ExtractionSchema.parse(normalized);
}

export function emptyParagraph21LlmPayload(): Paragraph21LlmPayload {
  return {
    documentNumber: null,
    issueDate: null,
    vin: null,
    manufacturer: null,
    model: null,
    modificationsField22: null,
    additionalRemarks: null,
  };
}

/** Map §21 extract → stored `approval_fields` (Einzelabnahme subtype). */
export function paragraph21ToApprovalFields(
  extracted: Paragraph21Extraction,
): Extract<ApprovalFields, { kind: "einzelabnahme" }> {
  const data: Einzelabnahme = {
    officialExpert: extracted.manufacturer ?? "Siehe Dokument",
    reportNumber: extracted.documentNumber ?? extracted.vin,
    field22Text:
      extracted.modificationsField22 ??
      extracted.additionalRemarks ??
      "Feld 22 siehe Originaldokument",
  };
  return { kind: "einzelabnahme", data };
}

/** Map §21 extract → analyze API / dashboard summary fields. */
export function paragraph21ToAnalyzeFields(
  extracted: Paragraph21Extraction,
  vinMatched: boolean | null,
): InvoiceTextParseResult {
  const matchNote =
    vinMatched === true
      ? "VIN (Feld E) stimmt mit Garage-Fahrzeug überein."
      : vinMatched === false
        ? "WARNUNG: VIN (Feld E) stimmt NICHT mit Garage-Fahrzeug überein."
        : null;

  const notes = [
    extracted.modificationsField22
      ? `Feld 22:\n${extracted.modificationsField22}`
      : null,
    extracted.additionalRemarks
      ? `Zusätzliche Bemerkungen:\n${extracted.additionalRemarks}`
      : null,
    matchNote,
  ]
    .filter(Boolean)
    .join("\n\n");

  const vehicleLabel = [extracted.manufacturer, extracted.model]
    .filter(Boolean)
    .join(" ");

  return normalizeTextParseResult({
    vendor: extracted.manufacturer,
    date: extracted.issueDate,
    amount: null,
    category: "abe",
    summary:
      vehicleLabel.length > 0
        ? `Einzelabnahme · ${vehicleLabel}`.slice(0, 80)
        : "Einzelabnahme §21",
    lineItems: null,
    kbaNumber: extracted.documentNumber,
    vehicleApprovals: [`VIN ${extracted.vin}`],
    authority: null,
    conditions: extracted.modificationsField22
      ? [extracted.modificationsField22.slice(0, 800)]
      : null,
    partCategory: null,
    notes: notes || null,
    manufacturer: extracted.manufacturer,
    invoiceNumber: extracted.documentNumber,
    mileageKm: null,
  });
}
