import {
  extractGrossTotalFromText,
  extractNetSumFromText,
  invoiceLineItemsMatchNetTotal,
  INVOICE_NET_TOTAL_TOLERANCE_EUR,
  stripNonPositionInvoiceRows,
  sumInvoiceLineItems,
} from "@/lib/ocr/invoice-footer-totals";
import {
  mergeContinuationInvoiceLineItems,
  realignShiftedInvoiceLineItems,
} from "@/lib/ocr/invoice-line-item-alignment";
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
  /** Net total extracted directly from OCR text (Nettosumme label). */
  footerNet: number | null;
  /**
   * Authoritative net total from the LLM's totals extraction — used as
   * fallback when footerNet is null (e.g. Nettosumme lives on a later page).
   */
  hintNetAmount?: number | null;
}): { preferLayoutRows: boolean; preferLlmRows: boolean; layoutTrusted: boolean } {
  const layout = options.layoutItems ?? [];
  const llm = options.llmItems ?? [];
  // Prefer the OCR-extracted label value; fall back to the LLM totals hint.
  const footerNet = options.footerNet ?? options.hintNetAmount ?? null;

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

  const layoutVerified =
    layoutDelta != null && layoutDelta <= INVOICE_NET_TOTAL_TOLERANCE_EUR;
  const llmTrusted = llmDelta != null && llmDelta <= INVOICE_NET_TOTAL_TOLERANCE_EUR;

  // When the invoice footer carries no explicit Nettosumme (footerNet == null),
  // fall back to trusting Azure Layout geometry directly.  Azure's structural
  // table parser identifies the Ges.-Preis column from the table header and
  // reads each cell precisely — more reliably than a vision LLM reading a
  // page-1 image whose rightmost column may be truncated at the scanner edge.
  // Guard: require ≥ 3 items with a non-trivial total to avoid trusting
  // accidental metadata table extractions.
  const layoutSelfTrusted =
    footerNet == null &&
    layout.length >= 3 &&
    layoutNetSum != null &&
    layoutNetSum > 5;

  const layoutTrusted = layoutVerified || layoutSelfTrusted;

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
 *
 * @param hintNetAmount - authoritative net total from the LLM's totals block;
 *   used when Nettosumme cannot be found in the OCR text (multi-page invoices).
 */
export function finalizeColumnFormatLineItems(options: {
  llmItems: InvoiceLineItem[] | null | undefined;
  layoutItems: InvoiceLineItem[] | null | undefined;
  ocrText: string;
  grossAmount: number | null;
  hintNetAmount?: number | null;
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
    hintNetAmount: options.hintNetAmount,
  });

  // Use OCR-extracted Nettosumme when available; fall back to LLM totals hint.
  const effectiveNet = footerNet ?? options.hintNetAmount ?? null;

  const merged = mergeLayoutAndLlmLineItems(
    options.llmItems,
    options.layoutItems,
    amount,
    {
      trustedNetTotal: effectiveNet,
      preferLayoutRows: trust.preferLayoutRows,
      preferLlmRows: trust.preferLlmRows,
      strictColumnMerge: true,
    },
  );

  const mergedMatchesNet = invoiceLineItemsMatchNetTotal(merged, effectiveNet);
  const layoutTrusted =
    trust.layoutTrusted ||
    trust.preferLayoutRows ||
    (mergedMatchesNet &&
      invoiceLineItemsMatchNetTotal(options.layoutItems, effectiveNet));

  let workingItems = merged;
  if (!layoutTrusted && ocrText && merged) {
    workingItems = reconcileLineItemAmountsWithOcrText(merged, ocrText);
  }

  const stripped = stripNonPositionInvoiceRows(workingItems);
  const mergedContinuations =
    mergeContinuationInvoiceLineItems(stripped) ?? stripped;
  const realigned = layoutTrusted
    ? mergedContinuations
    : realignShiftedInvoiceLineItems(mergedContinuations, effectiveNet);

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
