import { z } from "zod";

/** Categories returned by text-only LLM extraction (hybrid OCR). */
export const INVOICE_TEXT_PARSE_CATEGORIES = [
  "tuning",
  "service",
  "tuev",
  "repair",
  "abe",
  "other",
] as const;

export type InvoiceTextParseCategory =
  (typeof INVOICE_TEXT_PARSE_CATEGORIES)[number];

export const invoiceLineItemSchema = z.object({
  label: z.string().trim().min(1).max(160),
  amount: z.number().finite(),
});

export type InvoiceLineItem = z.infer<typeof invoiceLineItemSchema>;

const flexibleString = (max: number) =>
  z.preprocess((value) => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    if (!trimmed) return null;
    return trimmed.slice(0, max);
  }, z.string().min(1).max(max).nullable());

const flexibleStringList = (maxItem: number, maxItems: number) =>
  z.preprocess((value) => {
    if (value == null) return null;
    if (!Array.isArray(value)) return value;
    const cleaned = value
      .filter((entry): entry is string => typeof entry === "string")
      .map((entry) => entry.trim().slice(0, maxItem))
      .filter(Boolean)
      .slice(0, maxItems);
    return cleaned.length > 0 ? cleaned : null;
  }, z.array(z.string().min(1).max(maxItem)).max(maxItems).nullable());

export const invoiceTextParseSchema = z.object({
  vendor: flexibleString(160),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD")
    .nullable(),
  amount: z.number().finite().nullable(),
  category: z.enum(INVOICE_TEXT_PARSE_CATEGORIES),
  summary: flexibleString(80),
  lineItems: z.array(invoiceLineItemSchema).max(40).nullable(),
  /** ABE / Teilegutachten approval number (KBA, ABE-Nr., …). */
  kbaNumber: flexibleString(80),
  /** Approved vehicles: preferably make + model. */
  vehicleApprovals: flexibleStringList(160, 40),
  /** Issuing authority, e.g. KBA / Hersteller. */
  authority: flexibleString(120),
  /** ABE Auflagen / conditions — full wording, not summaries. */
  conditions: flexibleStringList(1200, 40),
  /** Part family label: Aerodynamik, Räder, Fahrwerk, Abgasanlage, … */
  partCategory: flexibleString(60),
  /** Longer freigabe description for ABE detail. */
  notes: flexibleString(500),
  /** ABE part manufacturer / brand (e.g. AutoExe, Milltek). */
  manufacturer: flexibleString(120),
  /** Invoice / Beleg number (e.g. RE-2026-0312). */
  invoiceNumber: flexibleString(80),
  /** Odometer reading in kilometers (Kilometerstand). */
  mileageKm: z.number().int().nonnegative().max(9_999_999).nullable(),
});

export type InvoiceTextParseResult = z.infer<typeof invoiceTextParseSchema>;

/**
 * OpenAI Structured Outputs JSON Schema (strict).
 * Keep in sync with `invoiceTextParseSchema`.
 */
export const INVOICE_TEXT_PARSE_JSON_SCHEMA = {
  name: "vehicle_invoice_text_parse",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "vendor",
      "date",
      "amount",
      "category",
      "summary",
      "lineItems",
      "kbaNumber",
      "vehicleApprovals",
      "authority",
      "conditions",
      "partCategory",
      "notes",
      "manufacturer",
      "invoiceNumber",
      "mileageKm",
    ],
    properties: {
      vendor: {
        type: ["string", "null"],
        description:
          "For invoices: workshop name. For ABE/Teilegutachten: part/product name (Bauteil), e.g. 'Carbon Frontlippe', 'Sportauspuff Dual Exit'. Null if absent.",
      },
      date: {
        type: ["string", "null"],
        description:
          "Invoice date / TÜV Prüfdatum / ABE issue date as YYYY-MM-DD.",
      },
      amount: {
        type: ["number", "null"],
        description: "Gross total EUR, or null for ABE/TÜV.",
      },
      category: {
        type: "string",
        enum: [...INVOICE_TEXT_PARSE_CATEGORIES],
        description:
          "abe = Teilegutachten/ABE. tuev = HU/AU. repair/service/tuning/other as appropriate.",
      },
      summary: {
        type: ["string", "null"],
        description: "Short 3-6 word German title/summary.",
      },
      lineItems: {
        type: ["array", "null"],
        description: "Invoice positions. Null for ABE/TÜV.",
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
      kbaNumber: {
        type: ["string", "null"],
        description:
          "ABE only: KBA approval number, preferably exactly 'KBA' + 5 digits (e.g. 'KBA 91234'). Also accept 'ABE-Nr. …' if that is what the document shows. Never put authority names here. Null otherwise.",
      },
      vehicleApprovals: {
        type: ["array", "null"],
        description:
          "ABE only: approved vehicles as 'Fahrzeughersteller + Fahrzeugmodell' from Verwendungsbereich / Handelsbezeichnung, e.g. 'Mazda RX-8', 'Mazda RX-8 Spirit R', 'BMW 320i', 'Audi A4 (B8)'. NEVER technical data (ET, Lochkreis, Radlast, Felgendurchmesser, Abrollumfang, EG-BE-Nr., tire sizes). Never make-only or bare type codes (SE3P). Null otherwise.",
        items: { type: "string" },
      },
      authority: {
        type: ["string", "null"],
        description:
          "ABE only: issuing body e.g. 'KBA / Hersteller', 'TÜV'. Null otherwise.",
      },
      conditions: {
        type: ["array", "null"],
        description:
          "ABE only: each Auflage as the COMPLETE original wording from the document (full sentences, no shortening or paraphrasing). One array entry per numbered Auflage / Auflagepunkt. Null otherwise.",
        items: { type: "string" },
      },
      partCategory: {
        type: ["string", "null"],
        description:
          "ABE only: short part family e.g. Aerodynamik, Räder, Fahrwerk, Abgasanlage, Ansaugung. Null otherwise.",
      },
      notes: {
        type: ["string", "null"],
        description:
          "ABE only: 1-3 sentence freigabe description. Null for invoices.",
      },
      manufacturer: {
        type: ["string", "null"],
        description:
          "ABE only: manufacturer / brand of the part, e.g. 'AutoExe', 'Milltek', 'OZ', 'Tein'. Not the vehicle make. Null otherwise.",
      },
      invoiceNumber: {
        type: ["string", "null"],
        description:
          "Invoice only: Beleg-/Rechnungsnummer e.g. 'RE-2026-0312'. Null for ABE/TÜV.",
      },
      mileageKm: {
        type: ["integer", "null"],
        description:
          "Invoice / service docs: odometer reading (Kilometerstand) as integer km, e.g. 67210. Parse values like '67.210 km' or '67210 km'. Null if absent or for ABE.",
      },
    },
  },
} as const;

function normalizeLineItems(
  items: InvoiceLineItem[] | null | undefined,
): InvoiceLineItem[] | null {
  if (!items?.length) return null;

  const cleaned = items
    .map((item) => ({
      label: item.label.trim().slice(0, 160),
      amount: Math.round(item.amount * 100) / 100,
    }))
    .filter((item) => item.label.length > 0 && Number.isFinite(item.amount))
    .slice(0, 40);

  return cleaned.length > 0 ? cleaned : null;
}

function normalizeStringList(
  values: string[] | null | undefined,
  maxLen: number,
  maxItems = 40,
): string[] | null {
  if (!values?.length) return null;
  const cleaned = values
    .map((value) => value.trim().slice(0, maxLen))
    .filter(Boolean)
    .slice(0, maxItems);
  return cleaned.length > 0 ? cleaned : null;
}

export function normalizeTextParseResult(
  fields: InvoiceTextParseResult,
): InvoiceTextParseResult {
  return {
    vendor: fields.vendor?.trim().slice(0, 160) || null,
    date: fields.date,
    amount:
      typeof fields.amount === "number"
        ? Math.round(fields.amount * 100) / 100
        : null,
    category: fields.category,
    summary: fields.summary?.trim().slice(0, 80) || null,
    lineItems: normalizeLineItems(fields.lineItems),
    kbaNumber: fields.kbaNumber?.trim().slice(0, 80) || null,
    vehicleApprovals: normalizeStringList(fields.vehicleApprovals, 160),
    authority: fields.authority?.trim().slice(0, 120) || null,
    conditions: normalizeStringList(fields.conditions, 1200, 40),
    partCategory: fields.partCategory?.trim().slice(0, 60) || null,
    notes: fields.notes?.trim().slice(0, 500) || null,
    manufacturer: fields.manufacturer?.trim().slice(0, 120) || null,
    invoiceNumber: fields.invoiceNumber?.trim().slice(0, 80) || null,
    mileageKm: normalizeMileageKm(fields.mileageKm),
  };
}

export function normalizeMileageKm(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const km = Math.round(value);
  if (km < 0 || km > 9_999_999) return null;
  return km;
}
