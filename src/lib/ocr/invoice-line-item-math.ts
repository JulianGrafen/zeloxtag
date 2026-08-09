/**
 * OCR adapter: maps raw LLM line items to verified `InvoiceLineItem` totals
 * via `@/utils/invoiceMath.processLineItems`.
 */

import type { InvoiceLineItem } from "@/lib/ocr/text-parse-schema";
import type { LlmRawLineItem } from "@/lib/validations/invoiceSchemas";
import { processLineItems } from "@/utils/invoiceMath";

export { LlmLineItemSchema, type LlmRawLineItem } from "@/lib/validations/invoiceSchemas";
export { parseGermanNumber, processLineItems } from "@/utils/invoiceMath";

function toInvoiceLineItems(processed: ReturnType<typeof processLineItems>): InvoiceLineItem[] {
  return processed
    .filter(
      (item) =>
        typeof item.label === "string" &&
        item.label.trim().length > 0 &&
        typeof item.gesamtpreis === "number" &&
        item.gesamtpreis > 0,
    )
    .map((item) => ({
      label: String(item.label).trim(),
      amount: item.gesamtpreis,
    }));
}

/**
 * Run bulletproof math on raw LLM output. Zod validation is best-effort only —
 * `processLineItems` always runs on the raw array so German strings are never blocked.
 */
export function parseLlmRawLineItems(value: unknown): InvoiceLineItem[] | null {
  if (!Array.isArray(value)) return null;

  const finalItems = processLineItems(value);
  const lineItems = toInvoiceLineItems(finalItems);
  return lineItems.length > 0 ? lineItems : null;
}

/** @deprecated Use `processLineItems` — kept for existing tests/callers. */
export function computeLineItemTotal(raw: LlmRawLineItem): InvoiceLineItem | null {
  const [processed] = processLineItems([raw]);
  if (!processed || processed.gesamtpreis <= 0) return null;
  return { label: raw.label, amount: processed.gesamtpreis };
}

/** @deprecated Use `processLineItems` — kept for existing tests/callers. */
export function parseAndVerifyLineItems(items: LlmRawLineItem[]): InvoiceLineItem[] {
  return toInvoiceLineItems(processLineItems(items));
}
