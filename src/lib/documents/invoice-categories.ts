/**
 * Invoice OCR / scan categories shown in Beleg lists.
 */

export const INVOICE_LIST_CATEGORIES = [
  "repair",
  "service",
  "tuning",
  "other",
] as const;

export type InvoiceListCategory = (typeof INVOICE_LIST_CATEGORIES)[number];

export const INVOICE_LIST_CATEGORY_LABELS: Record<InvoiceListCategory, string> =
  {
    repair: "Reparatur",
    service: "Service",
    tuning: "Tuning",
    other: "Sonstiges",
  };

export function parseInvoiceListCategory(
  value: string | null | undefined,
): InvoiceListCategory | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if ((INVOICE_LIST_CATEGORIES as readonly string[]).includes(normalized)) {
    return normalized as InvoiceListCategory;
  }
  return null;
}

/** Map stored document.category to a list chip id. */
export function resolveInvoiceListCategory(
  category: string | null | undefined,
): InvoiceListCategory {
  const parsed = parseInvoiceListCategory(category);
  if (parsed) return parsed;
  // Legacy / OCR variants
  const lower = category?.trim().toLowerCase() ?? "";
  if (lower.includes("reparatur") || lower === "werkstatt") return "repair";
  if (lower.includes("service") || lower.includes("inspektion")) return "service";
  if (lower.includes("tuning") || lower.includes("umbau")) return "tuning";
  return "other";
}
