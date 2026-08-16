import { isVatLineItem } from "@/lib/ocr/invoice-vat";

const LABOR_LABEL =
  /^(?:arbeitslohn|arbeitszeit|montage|demontage|kleinmaterial|entsorgung|material)$/i;

const SKIP_INVOICE_LINE =
  /^(?:summe|gesamt|netto|brutto|zwischensumme|position(?:en)?)$/i;

/** Parts that can appear as Umbau positions — skip VAT, labor, and totals. */
export function shouldIncludeInvoiceLine(label: string): boolean {
  const trimmed = label.trim();
  if (trimmed.length < 2) return false;
  if (isVatLineItem({ label: trimmed, amount: 0 })) return false;
  if (LABOR_LABEL.test(trimmed)) return false;
  if (/^(?:arbeitslohn|arbeitszeit)\b/i.test(trimmed)) return false;
  if (SKIP_INVOICE_LINE.test(trimmed)) return false;
  return true;
}
