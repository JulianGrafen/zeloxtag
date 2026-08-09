import type { InvoiceLineItem } from "@/lib/ocr/text-parse-schema";

const UNIT_PRICE_LABEL =
  /^(?:e-?preis|einzelpreis|ep|stückpreis|stk\.?\s*preis|listenpreis|netto(?:preis)?)$/i;

const COLUMN_HEADER_LABEL =
  /^(?:ges\.?\s*preis|gesamtpreis|ges\.?\s*summe|gp|menge|pos\.?|bezeichnung|betrag)$/i;

const PRICE_ONLY_LABEL =
  /^(?:€|eur)?\s*-?\d{1,3}(?:\.\d{3})*,\d{2}\s*(?:€|eur)?$/i;

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

/** True when `small` looks like Einzelpreis and `large` like Gesamtpreis (qty × unit). */
export function isUnitPriceAmountOfTotal(
  small: number,
  large: number,
): boolean {
  if (!Number.isFinite(small) || !Number.isFinite(large)) return false;
  if (small <= 0 || large <= 0 || small >= large - 0.01) return false;

  const ratio = large / small;
  const qty = Math.round(ratio);
  // Strict — 480/95 ≈ 5.05 must NOT count as qty×unit (false EP→GP upgrade).
  return qty >= 2 && qty <= 100 && Math.abs(ratio - qty) < 0.025;
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

    const looksLikeUnit = sorted.some(
      (other) =>
        other.amount > candidate.amount + 0.01 &&
        isUnitPriceAmountOfTotal(candidate.amount, other.amount),
    );
    if (looksLikeUnit) continue;

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
      (total) => total > amount + 0.01 && isUnitPriceAmountOfTotal(amount, total),
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
