import {
  extractGrossTotalFromText,
  extractNetSumFromText,
  invoiceLineItemsMatchNetTotal,
  INVOICE_NET_TOTAL_TOLERANCE_EUR,
  stripNonPositionInvoiceRows,
  sumInvoiceLineItems,
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

function resolveColumnSourceTrust(options: {
  llmItems: InvoiceLineItem[] | null | undefined;
  layoutItems: InvoiceLineItem[] | null | undefined;
  footerNet: number | null;
}): { preferLayoutRows: boolean; preferLlmRows: boolean; layoutTrusted: boolean } {
  const layout = options.layoutItems ?? [];
  const llm = options.llmItems ?? [];
  const footerNet = options.footerNet;

  if (layout.length < 3) {
    return { preferLayoutRows: false, preferLlmRows: false, layoutTrusted: false };
  }

  const layoutNetSum = sumInvoiceLineItems(layout);
  const llmNetSum = sumInvoiceLineItems(llm);
  const layoutDelta =
    footerNet != null && layoutNetSum != null
      ? Math.abs(layoutNetSum - footerNet)
      : null;
  const llmDelta =
    footerNet != null && llmNetSum != null ? Math.abs(llmNetSum - footerNet) : null;

  const layoutTrusted =
    layoutDelta != null && layoutDelta <= INVOICE_NET_TOTAL_TOLERANCE_EUR;
  const llmTrusted = llmDelta != null && llmDelta <= INVOICE_NET_TOTAL_TOLERANCE_EUR;

  let preferLayoutRows = false;
  let preferLlmRows = false;

  if (layoutTrusted && !llmTrusted) {
    preferLayoutRows = true;
  } else if (llmTrusted && !layoutTrusted) {
    preferLlmRows = true;
  } else if (layoutTrusted && llmTrusted) {
    preferLayoutRows = true;
  } else if (layoutDelta != null && llmDelta != null) {
    if (layoutDelta + 0.05 < llmDelta) preferLayoutRows = true;
    else if (llmDelta + 0.05 < layoutDelta) preferLlmRows = true;
  }

  return { preferLayoutRows, preferLlmRows, layoutTrusted };
}

/**
 * Pos | Menge | E-Preis | Ges. Preis pipeline shared by wizard + single-shot parse.
 * Layout geometry is authoritative when it reconciles with Nettosumme.
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

  const trust = resolveColumnSourceTrust({
    llmItems: options.llmItems,
    layoutItems: options.layoutItems,
    footerNet,
  });

  const merged = mergeLayoutAndLlmLineItems(
    options.llmItems,
    options.layoutItems,
    amount,
    {
      trustedNetTotal: footerNet,
      preferLayoutRows: trust.preferLayoutRows,
      preferLlmRows: trust.preferLlmRows,
      strictColumnMerge: true,
    },
  );

  const mergedMatchesNet = invoiceLineItemsMatchNetTotal(merged, footerNet);
  const layoutTrusted =
    trust.layoutTrusted ||
    trust.preferLayoutRows ||
    (mergedMatchesNet &&
      invoiceLineItemsMatchNetTotal(options.layoutItems, footerNet));

  let workingItems = merged;
  if (!layoutTrusted && ocrText && merged) {
    workingItems = reconcileLineItemAmountsWithOcrText(merged, ocrText);
  }

  const stripped = stripNonPositionInvoiceRows(workingItems);
  const realigned = layoutTrusted
    ? stripped
    : realignShiftedInvoiceLineItems(stripped, footerNet);

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
