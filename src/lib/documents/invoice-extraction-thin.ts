import { isInvoiceFooterSummaryLabel } from "@/lib/ocr/invoice-footer-totals";
import { isVatLineItem } from "@/lib/ocr/invoice-vat";
import type { InvoiceLineItem } from "@/lib/ocr/text-parse-schema";

/** Billable rows excluding MwSt. */
export function billableInvoiceLineItems(
  lineItems: InvoiceLineItem[] | null | undefined,
): InvoiceLineItem[] {
  if (!lineItems?.length) return [];
  return lineItems.filter(
    (item) => !isVatLineItem(item) && !isInvoiceFooterSummaryLabel(item.label),
  );
}

/**
 * True when a single full-page scan likely missed the Positions table —
 * prompt for an optional Positions close-up.
 */
export function isThinInvoiceExtraction(input: {
  lineItems: InvoiceLineItem[] | null | undefined;
  amount?: number | null;
}): boolean {
  const billable = billableInvoiceLineItems(input.lineItems);
  if (billable.length === 0) return true;
  if (billable.length >= 2) return false;

  const only = billable[0]!;
  const label = only.label.trim();
  if (!label || isInvoiceFooterSummaryLabel(label)) return true;

  const amount = input.amount;
  if (
    amount != null &&
    Number.isFinite(amount) &&
    Math.abs(only.amount - amount) <= 0.05
  ) {
    return true;
  }

  return false;
}
