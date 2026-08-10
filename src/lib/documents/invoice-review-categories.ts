import { scanTypeDefinition, type ScanType } from "@/lib/documents/scan-types";
import type { InvoiceTextParseCategory } from "@/lib/ocr/text-parse-schema";

/** User-facing invoice kinds after OCR — review step only. */
export const INVOICE_REVIEW_CATEGORIES = [
  "service",
  "repair",
  "tuning",
] as const;

export type InvoiceReviewCategory =
  (typeof INVOICE_REVIEW_CATEGORIES)[number];

export const INVOICE_REVIEW_CATEGORY_LABELS: Record<
  InvoiceReviewCategory,
  string
> = {
  service: "Inspektion",
  repair: "Reparatur",
  tuning: "Tuning",
};

export function isInvoiceReviewCategory(
  value: string | null | undefined,
): value is InvoiceReviewCategory {
  return (
    value === "service" || value === "repair" || value === "tuning"
  );
}

/** Map OCR / scan intent to a review dropdown value. */
export function normalizeInvoiceReviewCategory(
  category: InvoiceTextParseCategory | null | undefined,
  fallback: InvoiceReviewCategory = "service",
): InvoiceReviewCategory {
  if (isInvoiceReviewCategory(category)) return category;
  return fallback;
}

export function invoiceReviewCategoryFromScanType(
  scanType: ScanType,
): InvoiceReviewCategory {
  const def = scanTypeDefinition(scanType);
  return normalizeInvoiceReviewCategory(def.category, "service");
}
