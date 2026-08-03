import type { InvoiceOcrFields } from "./types";
import { INVOICE_OCR_CATEGORIES } from "./types";

/**
 * OpenAI Structured Outputs JSON Schema (strict).
 * Only the required invoice fields — keeps tokens/cost low.
 */
export const INVOICE_OCR_JSON_SCHEMA = {
  name: "vehicle_invoice_ocr",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["vendor", "date", "amount", "category"],
    properties: {
      vendor: {
        type: "string",
        description: "Garage, workshop, or store name as printed on the invoice.",
      },
      date: {
        type: ["string", "null"],
        description: "Invoice date in YYYY-MM-DD, or null if unreadable.",
      },
      amount: {
        type: ["number", "null"],
        description: "Total amount including tax as a number, or null if unreadable.",
      },
      category: {
        type: "string",
        enum: [...INVOICE_OCR_CATEGORIES],
        description:
          "Best-fit category: tuning parts/mods, routine service, repair, or inspection/TÜV.",
      },
    },
  },
} as const;

export function isInvoiceOcrFields(value: unknown): value is InvoiceOcrFields {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;

  if (typeof record.vendor !== "string") return false;
  if (!(record.date === null || typeof record.date === "string")) return false;
  if (!(record.amount === null || typeof record.amount === "number")) return false;
  if (
    typeof record.category !== "string" ||
    !(INVOICE_OCR_CATEGORIES as readonly string[]).includes(record.category)
  ) {
    return false;
  }

  if (typeof record.date === "string" && !/^\d{4}-\d{2}-\d{2}$/.test(record.date)) {
    return false;
  }

  if (typeof record.amount === "number" && !Number.isFinite(record.amount)) {
    return false;
  }

  return true;
}

export function normalizeOcrFields(fields: InvoiceOcrFields): InvoiceOcrFields {
  const vendor = fields.vendor.trim().slice(0, 120) || "Unbekannter Anbieter";
  const amount =
    typeof fields.amount === "number"
      ? Math.round(fields.amount * 100) / 100
      : null;

  return {
    vendor,
    date: fields.date,
    amount,
    category: fields.category,
  };
}
