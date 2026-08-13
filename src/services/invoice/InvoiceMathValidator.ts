import type { InvoiceLineItem, InvoiceLineItemDraft } from "@/types/invoice";

/** Allowed rounding drift for Menge × E-Preis vs Ges. Preis (EUR). */
export const INVOICE_LINE_MATH_TOLERANCE_EUR = 0.05;

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

    const unitForCheck = unitPrice ?? totalPrice;
    const expectedTotal = roundMoney(quantity * unitForCheck);
    const isMathValid =
      Math.abs(expectedTotal - totalPrice) < INVOICE_LINE_MATH_TOLERANCE_EUR;

    return {
      description: item.description.trim(),
      quantity,
      unit_price: unitPrice,
      total_price: totalPrice,
      is_math_valid: isMathValid,
    };
  });
}
