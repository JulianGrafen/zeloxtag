import type {
  InvoiceLineItem,
  InvoiceLineItemDraft,
  InvoiceTotalReconciliation,
  ParsedInvoice,
} from "@/types/invoice";
import { resolveInvoiceRowGesamtpreis } from "@/utils/invoiceMath";

/** Allowed rounding drift for Menge × E-Preis vs Ges. Preis (EUR). */
export const INVOICE_LINE_MATH_TOLERANCE_EUR = 0.05;

/** Allowed drift for Positions-Summe vs Nettosumme / Brutto (EUR). */
export const INVOICE_TOTAL_TOLERANCE_EUR = 1.5;

const VAT_LINE_LABEL =
  /\b(?:mwst|m\.?\s*w\.?\s*st\.?|ust\.?|umsatzsteuer|vat)\b/i;

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function isValidQuantity(quantity: number): boolean {
  return Number.isFinite(quantity) && quantity > 0;
}

/**
 * Post-extraction validator: normalize quantity, derive missing unit_price,
 * and flag rows where Menge × E-Preis ≈ Ges. Preis.
 */
export function validateAndFixLineItems(
  items: InvoiceLineItemDraft[],
): InvoiceLineItem[] {
  return items.map((item) => {
    const quantity = isValidQuantity(item.quantity) ? item.quantity : 1;
    const totalPrice = roundMoney(item.total_price);

    let unitPrice =
      item.unit_price != null ? roundMoney(item.unit_price) : null;

    if (unitPrice == null && quantity > 0) {
      unitPrice = roundMoney(totalPrice / quantity);
    }

    let fixedTotal = totalPrice;
    if (unitPrice != null && isValidQuantity(quantity)) {
      const resolved = resolveInvoiceRowGesamtpreis({
        menge: quantity,
        einzelpreis: unitPrice,
        gesamtpreis: totalPrice,
      });
      if (resolved != null) {
        fixedTotal = roundMoney(resolved);
      }
    }

    const unitForCheck = unitPrice ?? fixedTotal;
    const expectedTotal = roundMoney(quantity * unitForCheck);
    const isMathValid =
      Math.abs(expectedTotal - fixedTotal) < INVOICE_LINE_MATH_TOLERANCE_EUR;

    return {
      description: item.description.trim(),
      quantity,
      unit_price: unitPrice,
      total_price: fixedTotal,
      is_math_valid: isMathValid,
    };
  });
}

function isVatLineItem(item: InvoiceLineItem): boolean {
  return VAT_LINE_LABEL.test(item.description);
}

/** Sum all billable positions (excludes MwSt rows). */
export function sumBillableLineItemTotals(items: InvoiceLineItem[]): number {
  return roundMoney(
    items
      .filter((item) => !isVatLineItem(item))
      .reduce((sum, item) => sum + item.total_price, 0),
  );
}

function withinTolerance(
  delta: number | null,
  tolerance = INVOICE_TOTAL_TOLERANCE_EUR,
): boolean {
  return delta != null && delta <= tolerance;
}

/**
 * Total-Rechnung: summiert alle Positionen und prüft gegen Netto, MwSt und Brutto.
 */
export function reconcileInvoiceTotals(
  invoice: Omit<ParsedInvoice, "reconciliation">,
): ParsedInvoice {
  const lineItemsNetSum = sumBillableLineItemTotals(invoice.line_items);
  const { net_amount, vat_amount, gross_amount } = invoice.totals;

  const netDelta =
    net_amount != null
      ? roundMoney(Math.abs(lineItemsNetSum - net_amount))
      : null;

  const vatDelta =
    net_amount != null && vat_amount != null
      ? roundMoney(Math.abs(net_amount + vat_amount - gross_amount))
      : null;

  const grossDelta =
    vat_amount != null
      ? roundMoney(Math.abs(lineItemsNetSum + vat_amount - gross_amount))
      : net_amount != null
        ? roundMoney(Math.abs(lineItemsNetSum + (vat_amount ?? 0) - gross_amount))
        : null;

  const reconciliation: InvoiceTotalReconciliation = {
    line_items_net_sum: lineItemsNetSum,
    line_items_count: invoice.line_items.length,
    net_delta: netDelta,
    gross_delta: grossDelta,
    vat_delta: vatDelta,
    net_reconciled: withinTolerance(netDelta),
    gross_reconciled: withinTolerance(grossDelta),
    vat_reconciled: withinTolerance(vatDelta),
  };

  return { ...invoice, reconciliation };
}
