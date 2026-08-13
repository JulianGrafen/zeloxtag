import {
  extractGrossTotalFromText,
  extractNetSumFromText,
  stripNonPositionInvoiceRows,
} from "@/lib/ocr/invoice-footer-totals";
import { realignShiftedInvoiceLineItems } from "@/lib/ocr/invoice-line-item-alignment";
import { mergeLayoutAndLlmLineItems } from "@/lib/ocr/invoice-line-items-from-layout";
import { reconcileLineItemAmountsWithOcrText } from "@/lib/ocr/invoice-line-items-from-text";
import { ensureInvoiceVatAndGrossTotal } from "@/lib/ocr/invoice-vat";
import {
  normalizeLineItemsList,
  type InvoiceLineItem,
} from "@/lib/ocr/text-parse-schema";

const DEFAULT_MAX_ITEMS = 60;

/**
 * Pos | Menge | E-Preis | Ges. Preis pipeline shared by wizard + single-shot parse.
 * Uses table geometry and row order — not line-item description matching.
 */
export function finalizeColumnFormatLineItems(options: {
  llmItems: InvoiceLineItem[] | null | undefined;
  layoutItems: InvoiceLineItem[] | null | undefined;
  ocrText: string;
  grossAmount: number | null;
  maxItems?: number;
}): { lineItems: InvoiceLineItem[] | null; amount: number | null } {
  const maxItems = options.maxItems ?? DEFAULT_MAX_ITEMS;
  const ocrText = options.ocrText.trim();
  const footerNet = ocrText ? extractNetSumFromText(ocrText) : null;
  const footerGross = ocrText ? extractGrossTotalFromText(ocrText) : null;
  const amount = options.grossAmount ?? footerGross ?? null;

  const merged = mergeLayoutAndLlmLineItems(
    options.llmItems,
    options.layoutItems,
    amount,
    { trustedNetTotal: footerNet },
  );

  const reconciled =
    ocrText && merged
      ? reconcileLineItemAmountsWithOcrText(merged, ocrText)
      : merged;

  const realigned = realignShiftedInvoiceLineItems(
    stripNonPositionInvoiceRows(reconciled),
    footerNet ?? amount,
  );

  const normalized = normalizeLineItemsList(realigned, maxItems);
  const withVat = ensureInvoiceVatAndGrossTotal({
    lineItems: normalized,
    amount: footerGross ?? amount,
    ocrText: options.ocrText,
  });

  return {
    lineItems: withVat.lineItems,
    amount: withVat.amount,
  };
}
