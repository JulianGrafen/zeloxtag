import type { InvoiceLineItem } from "@/lib/ocr/text-parse-schema";

const GESAMT_LABEL =
  /gesamt(?:betrag|summe)?(?:\s+inkl\.?\s*(?:\d+\s*%?\s*)?(?:mwst|ust|u\.?\s*st\.?|eur)?)?|summe|total|endbetrag|endpreis|zu\s*zahlen|rechnungsbetrag|endsumme|prüfungsentgelt\s*gesamt|entgelt\s*gesamt/i;

const TAX_OR_NET_LABEL =
  /^(?:mwst|ust|mehrwertsteuer|umsatzsteuer)\b|ohne\s*mwst|nettobetrag|summe\s+netto/i;

export function isTuevTaxOrNetLineItem(label: string): boolean {
  const trimmed = label.trim();
  if (!trimmed) return true;
  return TAX_OR_NET_LABEL.test(trimmed);
}

function roundEuro(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Parse LLM/OCR fee values — supports German comma decimals. */
export function parseTuevAmountValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return roundEuro(value);
  }

  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  // German: 1.234,56 → 1234.56 | 125,00 → 125.0
  const normalized = trimmed
    .replace(/[^\d,.-]/g, "")
    .replace(/\.(?=\d{3}(?:[,.]|$))/g, "")
    .replace(",", ".");

  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return roundEuro(parsed);
}

export function normalizeTuevLineItems(
  value: unknown,
): InvoiceLineItem[] | null {
  if (!Array.isArray(value)) return null;

  const items: InvoiceLineItem[] = [];
  for (const entry of value) {
    if (typeof entry !== "object" || entry === null) continue;
    const record = entry as Record<string, unknown>;
    const label =
      typeof record.label === "string" ? record.label.trim() : "";
    const amount = parseTuevAmountValue(record.amount);
    if (!label || amount === null) continue;
    items.push({ label, amount });
  }

  return items.length > 0 ? items : null;
}

function sumTuevFeeLineItems(
  lineItems: readonly InvoiceLineItem[],
): number | null {
  const fees = lineItems.filter(
    (item) =>
      item.amount > 0 &&
      !isTuevTaxOrNetLineItem(item.label) &&
      !GESAMT_LABEL.test(item.label),
  );
  if (fees.length === 0) return null;

  const sum = roundEuro(fees.reduce((acc, item) => acc + item.amount, 0));
  return sum > 0 ? sum : null;
}

function amountMatchesTaxLineItem(
  amount: number,
  lineItems: readonly InvoiceLineItem[],
): boolean {
  return lineItems.some(
    (item) =>
      isTuevTaxOrNetLineItem(item.label) &&
      Math.abs(item.amount - amount) < 0.02,
  );
}

/**
 * Resolve the total Prüfgebühr from LLM output.
 *
 * Common failure: model returns a line item (e.g. HU 123,81 €) instead of
 * Gesamtbetrag (125,00 €). Prefer explicit "Gesamt" rows, else sum line items
 * when they exceed the reported total.
 */
export function resolveTuevTotalAmount(
  amount: number | null | undefined,
  lineItems: InvoiceLineItem[] | null | undefined,
): number | null {
  const parsedAmount =
    amount !== null && amount !== undefined && amount > 0
      ? roundEuro(amount)
      : null;

  if (!lineItems?.length) {
    return parsedAmount;
  }

  for (const item of lineItems) {
    if (GESAMT_LABEL.test(item.label) && item.amount > 0) {
      if (/ohne\s*mwst|nettobetrag/i.test(item.label)) continue;
      return roundEuro(item.amount);
    }
  }

  const feeSum = sumTuevFeeLineItems(lineItems);

  const sum = feeSum ?? roundEuro(
    lineItems.reduce((acc, item) => acc + (item.amount > 0 ? item.amount : 0), 0),
  );

  if (parsedAmount === null) {
    return sum > 0 ? sum : null;
  }

  if (amountMatchesTaxLineItem(parsedAmount, lineItems)) {
    if (feeSum !== null && feeSum > parsedAmount) return feeSum;
    return null;
  }

  // Sum of fee rows beats a single partial line (DEKRA: 123,81 + 1,19 = 125,00).
  if (feeSum !== null && feeSum > parsedAmount + 0.05) {
    return feeSum;
  }

  if (sum > parsedAmount + 0.05) {
    return sum;
  }

  return parsedAmount;
}
