import type { InvoiceLineItem } from "@/lib/ocr/text-parse-schema";

const GESAMT_LABEL =
  /gesamt(?:betrag)?|summe|total|endbetrag|zu\s*zahlen|prüfungsentgelt\s*gesamt/i;

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
      return roundEuro(item.amount);
    }
  }

  const sum = roundEuro(
    lineItems.reduce((acc, item) => acc + (item.amount > 0 ? item.amount : 0), 0),
  );

  if (parsedAmount === null) {
    return sum > 0 ? sum : null;
  }

  // Sum of fee rows beats a single partial line (DEKRA: 123,81 + 1,19 = 125,00).
  if (sum > parsedAmount + 0.05) {
    return sum;
  }

  return parsedAmount;
}
