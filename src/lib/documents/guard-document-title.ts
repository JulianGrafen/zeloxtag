import { isJunkInvoiceLineLabel } from "@/lib/ocr/invoice-line-item-dedupe";

const LINE_ITEM_TITLE =
  /^(?:positionssumme|arbeitsaufwandsanteil|positions(?:summe)?|zwischensumme|nettosumme|endsumme|gesamtbetrag|materialanteil|kleinmaterial)$/i;

const QTY_PRICE_SUFFIX =
  /\s+\d+[,.]\d+\s+\d+[,.]\d+\s*$/;

/** Reject invoice line labels masquerading as document titles. */
export function isInvalidDocumentTitle(title: string): boolean {
  const trimmed = title.trim();
  if (trimmed.length < 2) return true;
  if (LINE_ITEM_TITLE.test(trimmed)) return true;
  if (isJunkInvoiceLineLabel(trimmed)) return true;
  if (QTY_PRICE_SUFFIX.test(trimmed)) return true;
  return false;
}

export function guardDocumentTitle(
  title: string,
  fallback: string,
): string {
  const trimmed = title.trim();
  if (!trimmed || isInvalidDocumentTitle(trimmed)) {
    return fallback.trim().slice(0, 160) || "Beleg";
  }
  return trimmed.slice(0, 160);
}
