import type { InvoiceLineItem } from "@/lib/ocr/text-parse-schema";

const UNIT_PRICE_LABEL =
  /^(?:e-?preis|einzelpreis|ep|stückpreis|stk\.?\s*preis|listenpreis|netto(?:preis)?)$/i;

const COLUMN_HEADER_LABEL =
  /^(?:ges\.?\s*preis|gesamtpreis|ges\.?\s*summe|gp|menge|pos\.?|bezeichnung|betrag)$/i;

const PRICE_ONLY_LABEL =
  /^(?:€|eur)?\s*-?\d{1,3}(?:\.\d{3})*,\d{2}\s*(?:€|eur)?$/i;

/** Unit/column/footer tokens misread as position labels (common Azure column shift). */
const JUNK_INVOICE_LINE_LABEL =
  /^(?:stück|stk\.?|std\.?|einheit|anzahl|art\.?|pg\.?|pos\.?|menge|e-?preis|einzelpreis|ges\.?\s*preis|preis-?€|endpreis|endsummen|netto(?:\s+summe)?|positionssumme|zahlbar|brutto|endsumme|mechanik|gesamt)$/i;

export function isJunkInvoiceLineLabel(label: string): boolean {
  const trimmed = label.trim();
  if (JUNK_INVOICE_LINE_LABEL.test(trimmed)) return true;
  if (isPriceOnlyLineLabel(trimmed)) return true;
  if (UNIT_PRICE_LABEL.test(trimmed) || COLUMN_HEADER_LABEL.test(trimmed)) return true;
  // Footer row captured as line item
  if (/^endpreis\b/i.test(trimmed)) return true;
  if (/^gesamt$/i.test(trimmed)) return true;
  if (/^netto\s+summe\b/i.test(trimmed)) return true;
  if (/^gesamtbetrag\b/i.test(trimmed)) return true;
  if (/^nettosumme\b/i.test(trimmed)) return true;
  return false;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Normalize label for grouping rows that belong to the same table line. */
export function normalizedInvoiceLineLabelKey(label: string): string {
  return label
    .toLowerCase()
    .replace(/\b(?:e-?preis|einzelpreis|ep|ges\.?\s*preis|gesamtpreis|gp)\b/gi, " ")
    .replace(/\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2}/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isPriceOnlyLineLabel(label: string): boolean {
  return PRICE_ONLY_LABEL.test(label.trim());
}

/** True when `rate` is a Stundenpreis and `lineTotal` is the matching Zeilenbetrag (qty < 1). */
export function isHourlyRateOfLineTotal(rate: number, lineTotal: number): boolean {
  if (!Number.isFinite(rate) || !Number.isFinite(lineTotal)) return false;
  if (rate <= lineTotal + 0.01) return false;

  const qty = Math.round((lineTotal / rate) * 100) / 100;
  if (qty < 0.01 || qty >= 2) return false;

  const product = parseFloat((rate * qty).toFixed(2));
  return Math.abs(product - lineTotal) <= 0.05;
}

/** True when `small` looks like Einzelpreis and `large` like Gesamtpreis (qty × unit). */
export function isUnitPriceAmountOfTotal(
  small: number,
  large: number,
): boolean {
  if (!Number.isFinite(small) || !Number.isFinite(large)) return false;
  if (small <= 0 || large <= 0 || small >= large - 0.01) return false;

  const ratio = large / small;
  const qty = Math.round(ratio);
  if (qty >= 2 && qty <= 100 && Math.abs(ratio - qty) < 0.06) {
    return true;
  }

  const fractionalQty = Math.round(ratio * 100) / 100;
  if (fractionalQty >= 0.01 && fractionalQty < 2) {
    const product = parseFloat((small * fractionalQty).toFixed(2));
    if (Math.abs(product - large) <= 0.05) return true;
  }

  return false;
}

function isJunkColumnRow(item: InvoiceLineItem): boolean {
  const label = item.label.trim();
  return UNIT_PRICE_LABEL.test(label) || COLUMN_HEADER_LABEL.test(label);
}

function dropUnitPriceDuplicatesInGroup(
  group: InvoiceLineItem[],
): InvoiceLineItem[] {
  if (group.length <= 1) return group;

  const sorted = [...group].sort((a, b) => b.amount - a.amount);
  const kept: InvoiceLineItem[] = [];

  for (const candidate of sorted) {
    const duplicateAmount = kept.some(
      (existing) =>
        Math.abs(existing.amount - candidate.amount) < 0.011 &&
        normalizedInvoiceLineLabelKey(existing.label) ===
          normalizedInvoiceLineLabelKey(candidate.label),
    );
    if (duplicateAmount) continue;

    const looksLikeUnitPrice = sorted.some(
      (other) =>
        other.amount > candidate.amount + 0.01 &&
        isUnitPriceAmountOfTotal(candidate.amount, other.amount) &&
        !isHourlyRateOfLineTotal(other.amount, candidate.amount),
    );
    const looksLikeHourlyRate = sorted.some(
      (other) =>
        candidate.amount > other.amount + 0.01 &&
        isHourlyRateOfLineTotal(candidate.amount, other.amount),
    );
    if (looksLikeUnitPrice || looksLikeHourlyRate) continue;

    kept.push(candidate);
  }

  return kept;
}

/**
 * Remove duplicate rows where LLM/OCR captured both Einzelpreis (E-Preis) and Gesamtpreis
 * for the same table line. Keeps the Gesamtpreis / rightmost column value.
 */
export function dedupeInvoiceLineItemUnitPrices(
  items: InvoiceLineItem[],
): InvoiceLineItem[] {
  if (items.length <= 1) return items;

  const filtered = items.filter((item) => !isJunkColumnRow(item));
  const pool = filtered.length > 0 ? filtered : items;

  const groups = new Map<string, InvoiceLineItem[]>();
  const weakLabelItems: InvoiceLineItem[] = [];

  for (const item of pool) {
    const key = normalizedInvoiceLineLabelKey(item.label);
    if (key.length < 3 || isPriceOnlyLineLabel(item.label)) {
      weakLabelItems.push(item);
      continue;
    }
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
  }

  const merged: InvoiceLineItem[] = [];
  for (const group of groups.values()) {
    merged.push(...dropUnitPriceDuplicatesInGroup(group));
  }

  const realAmounts = new Set(merged.map((item) => roundMoney(item.amount)));
  const allTotals = merged.map((item) => item.amount);

  for (const item of weakLabelItems) {
    const amount = roundMoney(item.amount);

    if (isPriceOnlyLineLabel(item.label) && realAmounts.has(amount)) {
      continue;
    }

    const orphanUnit = allTotals.some(
      (total) =>
        (total > amount + 0.01 && isUnitPriceAmountOfTotal(amount, total)) ||
        (amount > total + 0.01 && isHourlyRateOfLineTotal(amount, total)),
    );
    if (orphanUnit && (isPriceOnlyLineLabel(item.label) || item.label.length <= 14)) {
      continue;
    }

    const exactDuplicate = merged.some(
      (existing) => Math.abs(existing.amount - amount) < 0.011,
    );
    if (exactDuplicate && (isPriceOnlyLineLabel(item.label) || item.label.length <= 10)) {
      continue;
    }

    merged.push(item);
  }

  return merged;
}
