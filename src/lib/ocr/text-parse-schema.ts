import { z } from "zod";

import { normalizeDocumentDateIso } from "@/lib/documents/format";
import {
  coerceGermanMoneyAmount,
  sanitizeLlmMoneyAmount,
} from "@/lib/ocr/parse-german-money";
import { dedupeInvoiceLineItemUnitPrices, isJunkInvoiceLineLabel } from "@/lib/ocr/invoice-line-item-dedupe";
import {
  isHtmlDebrisLabel,
  stripHtmlTags,
} from "@/lib/ocr/normalize-ocr-markdown";

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

/** Coerce LLM/OCR number-ish values ("428,90", "67.210") into finite numbers. */
export function coerceLooseNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  // Percentages are never EUR / km — parseFloat("15%") === 15 otherwise.
  if (/%/.test(trimmed)) return null;

  let normalized = trimmed.replace(/\s/g, "").replace(/€|eur/gi, "");
  if (/\d,\d{1,2}$/.test(normalized) && normalized.includes(".")) {
    normalized = normalized.replace(/\./g, "").replace(",", ".");
  } else if (/\d,\d{1,2}$/.test(normalized)) {
    normalized = normalized.replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(normalized)) {
    // German thousands without decimals: 67.210 → 67210
    normalized = normalized.replace(/\./g, "");
  }

  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function looseMoneySchema(max = Number.POSITIVE_INFINITY) {
  return z.preprocess(
    (value) => coerceGermanMoneyAmount(value, "conservative"),
    z.number().finite().max(max).nullable(),
  );
}

export const invoiceLineItemSchema = z.object({
  label: z.string().trim().min(1).max(160),
  amount: z.preprocess(
    (value) => coerceGermanMoneyAmount(value, "aggressive") ?? value,
    z.number().finite(),
  ),
});

export type InvoiceLineItem = z.infer<typeof invoiceLineItemSchema>;

export const invoiceTextParseSchema = z.object({
  vendor: z.string().trim().min(1).max(160).nullable(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD")
    .nullable(),
  amount: looseMoneySchema(250_000),
  category: z.enum(INVOICE_TEXT_PARSE_CATEGORIES),
  summary: z.string().trim().min(1).max(80).nullable(),
  lineItems: z.array(invoiceLineItemSchema).max(60).nullable(),
  /** ABE / Teilegutachten approval number (KBA, ABE-Nr., …). */
  kbaNumber: z.string().trim().min(1).max(80).nullable(),
  /** Vehicles / variants the part is approved for. */
  vehicleApprovals: z.array(z.string().trim().min(1).max(120)).max(40).nullable(),
  /** Issuing authority, e.g. KBA / Hersteller. */
  authority: z.string().trim().min(1).max(120).nullable(),
  /** ABE Auflagen / conditions — full wording, not summaries. */
  conditions: z.array(z.string().trim().min(1).max(2400)).max(40).nullable(),
  /** Part family label, or Teilegutachten Art der Umrüstung (may be multi-line). */
  partCategory: z.string().trim().min(1).max(2_000).nullable(),
  /** Longer freigabe description for ABE detail. */
  notes: z.string().trim().min(1).max(500).nullable(),
  /** ABE part manufacturer / brand (e.g. AutoExe, Milltek). */
  manufacturer: z.string().trim().min(1).max(120).nullable(),
  /** Invoice / Beleg number (e.g. RE-2026-0312). */
  invoiceNumber: z.string().trim().min(1).max(80).nullable(),
  /** Odometer / Kilometerstand from the invoice (km). */
  mileageKm: z.preprocess((value) => {
    const n = coerceLooseNumber(value);
    if (n === null) return null;
    return Math.round(n);
  }, z.number().int().nonnegative().max(9_999_999).nullable()),
});

export type InvoiceTextParseResult = z.infer<typeof invoiceTextParseSchema>;

const INVOICE_TEXT_PARSE_JSON_SCHEMA_BASE = {
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
        description:
          "Gross total EUR only (Rechnungsbetrag/Zahlbetrag). Never a percentage such as 15 from '-15%' or 'Skonto 2%'. Null for ABE/TÜV.",
      },
      category: {
        type: "string",
        enum: [...INVOICE_TEXT_PARSE_CATEGORIES],
        description:
          "InvoiceParseService: tuning|service|tuev|repair|other (never abe). Use tuev ONLY for real HU/AU Prüfberichte — NOT for workshop invoices that merely mention TÜV/DEKRA. category=abe is set only by AbeParseService.",
      },
      summary: {
        type: ["string", "null"],
        description: "Short 3-6 word German title/summary.",
      },
      lineItems: {
        type: ["array", "null"],
        description:
          "Invoice positions — ONE entry per billable row. Never merge materials (e.g. Reifen, Sportfedern, Felgen, Motoröl, Ölfilter, Bremsen) into one label. Include labor and MwSt. as separate rows when present. amount = Gesamtpreis/Zeilensumme only (NOT Einzelpreis/Stückpreis). Null for ABE/TÜV.",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["label", "amount"],
          properties: {
            label: {
              type: "string",
              description:
                "Short position name only, e.g. 'Sportfedern H&R', 'Reifen 225/45 R17', 'Arbeitslohn Montage'. Do not concatenate multiple parts.",
            },
            amount: {
              type: "number",
              description:
                "NUR Ges. Preis / Gesamtpreis / Zeilensumme aus der RECHTSTEN Spalte. NIE Einzelpreis/EP/Stückpreis. Bei 4×120 und Ges.preis 480 → 480.",
            },
          },
        },
      },
      kbaNumber: {
        type: ["string", "null"],
        description:
          "ABE only: approval number e.g. 'ABE KBA 12345'. Null otherwise.",
      },
      vehicleApprovals: {
        type: ["array", "null"],
        description: "ABE only: approved vehicles/variants. Null otherwise.",
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
          "ABE only: Hersteller / Herstellerzeichen of the part (e.g. AutoExe, Milltek, OZ, Tein). NEVER use Auftraggeber, Antragsteller, Besteller, Inverkehrbringer, Importeur, or Vertreiber. Not the vehicle make. Null if absent or only Auftraggeber is present.",
      },
      invoiceNumber: {
        type: ["string", "null"],
        description:
          "Invoice only: Beleg-/Rechnungsnummer e.g. 'RE-2026-0312'. Null for ABE/TÜV.",
      },
      mileageKm: {
        type: ["integer", "null"],
        description:
          "Invoice only: odometer reading as integer km (e.g. 67210). Required when labels like Kilometerstand, km-Stand, Tachostand, or values like '67.210 km' appear. Strip thousand separators. Null if absent or for ABE/TÜV.",
      },
    },
  },
} as const;

export type InvoiceTextParseJsonSchemaOptions = {
  /** HU/AU Prüfbericht — enables header mileage + Vorgangsnummer in schema hints. */
  documentType?: "invoice" | "tuev";
};

type InvoiceTextParseJsonSchema = {
  name: string;
  strict: true;
  schema: Record<string, unknown>;
};

/**
 * OpenAI Structured Outputs JSON Schema (strict).
 * Keep in sync with `invoiceTextParseSchema`.
 */
export const INVOICE_TEXT_PARSE_JSON_SCHEMA = INVOICE_TEXT_PARSE_JSON_SCHEMA_BASE;

/** TÜV cost/metadata parse uses the same shape but must not suppress header fields. */
export function buildInvoiceTextParseJsonSchema(
  options: InvoiceTextParseJsonSchemaOptions = {},
): InvoiceTextParseJsonSchema {
  if (options.documentType !== "tuev") {
    return INVOICE_TEXT_PARSE_JSON_SCHEMA;
  }

  return {
    ...INVOICE_TEXT_PARSE_JSON_SCHEMA_BASE,
    name: "tuev_report_cost_parse",
    schema: {
      ...INVOICE_TEXT_PARSE_JSON_SCHEMA_BASE.schema,
      properties: {
        ...INVOICE_TEXT_PARSE_JSON_SCHEMA_BASE.schema.properties,
        amount: {
          type: ["number", "null"],
          description:
            "HU/AU Prüfgebühren / Gesamtbetrag in EUR. Never a percentage. Null if not shown.",
        },
        invoiceNumber: {
          type: ["string", "null"],
          description:
            "Vorgangs-/Beleg-/Berichtsnummer from the report header (e.g. HU-2026-991). Null if absent.",
        },
        mileageKm: {
          type: ["integer", "null"],
          description:
            "Kilometerstand from the document header (Kopf, top of page 1) as integer km. " +
            "Look for KM-Stand, Kilometerstand, km-Stand, Tachostand near Kennzeichen / Fahrgestellnummer / Prüfdatum. " +
            "Strip thousand separators (142.350 → 142350). Required when visible in the header.",
        },
      },
    },
  };
}

/** Standalone monetary discount row (must be subtracted, never dropped). */
export function isMonetaryDiscountLabel(label: string): boolean {
  return /rabatt|skonto|nachlass|gutschrift/i.test(label);
}

/** Positive Rabatt/Skonto amounts are stored as negatives so they reduce the sum. */
export function signedInvoiceLineAmount(label: string, amount: number): number {
  if (!Number.isFinite(amount) || amount < 0) return amount;
  if (isMonetaryDiscountLabel(label)) return -Math.abs(amount);
  return amount;
}

/**
 * True when the line amount is just a restated percentage from the label
 * (e.g. label "MwSt 19%", amount 19) — never a EUR position.
 * Rabatt/Skonto/Nachlass rows are monetary and must not be filtered here.
 */
export function isPercentRestatedAsAmount(
  label: string,
  amount: number,
): boolean {
  if (!Number.isFinite(amount)) return false;
  if (/(?:€|eur)\b/i.test(label)) return false;
  if (isMonetaryDiscountLabel(label)) return false;

  const percentMatch = label.match(/(-?\d+(?:[.,]\d+)?)\s*%/);
  if (!percentMatch?.[1]) return false;

  const percentValue = Number.parseFloat(percentMatch[1].replace(",", "."));
  if (!Number.isFinite(percentValue)) return false;

  return (
    Math.abs(percentValue - amount) < 0.001 ||
    Math.abs(percentValue + amount) < 0.001 ||
    Math.abs(Math.abs(percentValue) - Math.abs(amount)) < 0.001
  );
}

function sanitizeLineItemRows(
  items: InvoiceLineItem[],
): InvoiceLineItem[] {
  return items
    .map((item) => {
      const label = stripHtmlTags(item.label).replace(/\s+/g, " ").trim().slice(0, 160);
      return {
        label,
        amount: signedInvoiceLineAmount(
          label,
          sanitizeLlmMoneyAmount(item.amount, "aggressive"),
        ),
      };
    })
    .filter(
      (item) =>
        item.label.length > 0 &&
        Number.isFinite(item.amount) &&
        !isHtmlDebrisLabel(item.label) &&
        !isJunkInvoiceLineLabel(item.label) &&
        !/(?:^|[^a-zäöüß])(?:mwst|m\.?\s*w\.?\s*st\.?|umsatzsteuer|vat\s*19)(?:[^a-zäöüß]|$)/i.test(
          item.label,
        ) &&
        /[a-zäöüß]{2,}/i.test(item.label) &&
        !isPercentRestatedAsAmount(item.label, item.amount),
    );
}

/** Light sanitization for wizard review — keeps position count/order, no EP/GP dedupe. */
export function normalizeLineItemsForReview(
  items: InvoiceLineItem[] | null | undefined,
  maxItems = 40,
): InvoiceLineItem[] | null {
  if (!items?.length) return null;

  const cleaned = sanitizeLineItemRows(items).slice(0, maxItems);
  return cleaned.length > 0 ? cleaned : null;
}

export function normalizeLineItemsList(
  items: InvoiceLineItem[] | null | undefined,
  maxItems = 40,
): InvoiceLineItem[] | null {
  if (!items?.length) return null;

  const cleaned = dedupeInvoiceLineItemUnitPrices(sanitizeLineItemRows(items)).slice(
    0,
    maxItems,
  );

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
  options: { preservePositions?: boolean } = {},
): InvoiceTextParseResult {
  const vendorRaw = fields.vendor?.trim();
  const vendor = vendorRaw
    ? stripHtmlTags(vendorRaw).replace(/\s+/g, " ").trim().slice(0, 160) || null
    : null;

  return {
    vendor,
    date: normalizeDocumentDateIso(fields.date) ?? fields.date,
    amount:
      typeof fields.amount === "number"
        ? sanitizeLlmMoneyAmount(fields.amount, "conservative")
        : null,
    category: fields.category,
    summary: fields.summary?.trim().slice(0, 80) || null,
    lineItems: options.preservePositions
      ? normalizeLineItemsForReview(fields.lineItems, 60)
      : normalizeLineItemsList(fields.lineItems, 60),
    kbaNumber: fields.kbaNumber?.trim().slice(0, 80) || null,
    vehicleApprovals: normalizeStringList(fields.vehicleApprovals, 120),
    authority: fields.authority?.trim().slice(0, 120) || null,
    conditions: normalizeStringList(fields.conditions, 1200, 40),
    partCategory: fields.partCategory?.trim().slice(0, 2_000) || null,
    notes: fields.notes?.trim().slice(0, 500) || null,
    manufacturer: fields.manufacturer?.trim().slice(0, 120) || null,
    invoiceNumber: fields.invoiceNumber?.trim().slice(0, 80) || null,
    mileageKm: normalizeMileageKm(fields.mileageKm),
  };
}

function normalizeMileageKm(value: number | null | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const km = Math.round(value);
  if (km < 0 || km > 9_999_999) return null;
  return km;
}
