import {
  isPriceOnlyLineLabel,
  isUnitPriceAmountOfTotal,
} from "@/lib/ocr/invoice-line-item-dedupe";
import type { InvoiceLineItem } from "@/lib/ocr/text-parse-schema";

const TABLE_HEADER_LABEL =
  /^(?:pos\.?|position|bezeichnung|beschreibung|artikel|menge|einzelpreis|e-?preis|ep|stückpreis|ges\.?\s*preis|gesamtpreis|ges\.?\s*summe|gp|betrag|summe|nr\.?|anz\.?|stk\.?|preis|wert|total)$/i;

const AMOUNT_ONLY_LINE =
  /^\s*(?:€|eur)?\s*(-?\d{1,3}(?:\.\d{3})*,\d{2}|-?\d+,\d{2})\s*(?:€|eur)?\s*$/i;

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function sumLineItems(items: InvoiceLineItem[]): number {
  return roundMoney(items.reduce((sum, item) => sum + item.amount, 0));
}

export function isLikelyInvoiceTableHeaderRow(item: InvoiceLineItem): boolean {
  const label = item.label.trim();
  if (TABLE_HEADER_LABEL.test(label)) return true;
  if (isPriceOnlyLineLabel(label)) return true;
  if (/^(?:pos|menge|einzel|ges\.?)\b/i.test(label) && label.length <= 18) {
    return true;
  }
  return false;
}

type AlignmentCandidate = {
  items: InvoiceLineItem[];
  transform: string;
};

function cloneItems(items: InvoiceLineItem[]): InvoiceLineItem[] {
  return items.map((item) => ({
    label: item.label,
    amount: roundMoney(item.amount),
  }));
}

/** Drop leading table-header rows the LLM sometimes reads as data. */
function dropLeadingHeaderRows(items: InvoiceLineItem[]): InvoiceLineItem[] {
  let start = 0;
  while (start < items.length && isLikelyInvoiceTableHeaderRow(items[start]!)) {
    start += 1;
  }
  return start > 0 ? items.slice(start) : items;
}

/**
 * LLM paired each label with the amount from the row below.
 * label[i] should use amount[i+1]; last row is dropped.
 */
function shiftAmountsFromNextRow(items: InvoiceLineItem[]): InvoiceLineItem[] {
  if (items.length < 2) return items;
  return items.slice(0, -1).map((item, index) => ({
    label: item.label,
    amount: items[index + 1]!.amount,
  }));
}

/**
 * LLM paired each label with the amount from the row above (after a junk first row).
 * label[i] should use amount[i-1]; first data row is dropped.
 */
function shiftAmountsFromPreviousRow(items: InvoiceLineItem[]): InvoiceLineItem[] {
  if (items.length < 2) return items;
  return items.slice(1).map((item, index) => ({
    label: item.label,
    amount: items[index]!.amount,
  }));
}

function buildAlignmentCandidates(items: InvoiceLineItem[]): AlignmentCandidate[] {
  const base = cloneItems(items);
  const withoutHeaders = dropLeadingHeaderRows(base);

  const candidates: AlignmentCandidate[] = [
    { items: base, transform: "identity" },
    { items: withoutHeaders, transform: "drop-headers" },
    { items: shiftAmountsFromNextRow(base), transform: "shift-next" },
    { items: shiftAmountsFromPreviousRow(base), transform: "shift-prev" },
    {
      items: shiftAmountsFromNextRow(withoutHeaders),
      transform: "drop-headers+shift-next",
    },
    {
      items: shiftAmountsFromPreviousRow(withoutHeaders),
      transform: "drop-headers+shift-prev",
    },
  ];

  return candidates.filter(
    (candidate) =>
      candidate.items.length > 0 &&
      candidate.items.every(
        (item) =>
          item.label.trim().length > 0 &&
          Number.isFinite(item.amount) &&
          !isLikelyInvoiceTableHeaderRow(item),
      ),
  );
}

function scoreAlignment(
  items: InvoiceLineItem[],
  totalAmount: number | null,
): number {
  let score = 0;

  for (const item of items) {
    if (isLikelyInvoiceTableHeaderRow(item)) score += 100;
    if (isPriceOnlyLineLabel(item.label)) score += 40;
    if (item.amount <= 0 && !/rabatt|skonto|gutschrift/i.test(item.label)) {
      score += 25;
    }
  }

  for (let index = 0; index < items.length - 1; index += 1) {
    const current = items[index]!;
    const next = items[index + 1]!;
    if (isUnitPriceAmountOfTotal(current.amount, next.amount)) {
      score += 8;
    }
  }

  const sum = sumLineItems(items);
  if (totalAmount != null && totalAmount > 0) {
    const diff = Math.abs(sum - totalAmount);
    const relative = diff / totalAmount;
    if (relative <= 0.015) score -= 40;
    else if (relative <= 0.04) score -= 20;
    else if (relative <= 0.12) score += diff;
    else score += diff * 2;
  }

  return score;
}

/**
 * Correct common vision-LLM row drift where € amounts sit one row above/below
 * the matching description.
 */
export function realignShiftedInvoiceLineItems(
  items: InvoiceLineItem[] | null | undefined,
  totalAmount: number | null = null,
): InvoiceLineItem[] | null {
  if (!items?.length) return items ?? null;
  if (items.length < 2) return items;

  const candidates = buildAlignmentCandidates(items);
  if (candidates.length === 0) return items;

  const baselineScore = scoreAlignment(items, totalAmount);
  let best = candidates[0]!;
  let bestScore = scoreAlignment(best.items, totalAmount);

  for (const candidate of candidates.slice(1)) {
    const candidateScore = scoreAlignment(candidate.items, totalAmount);
    if (candidateScore < bestScore - 0.001) {
      best = candidate;
      bestScore = candidateScore;
    }
  }

  if (bestScore >= baselineScore - 0.001 || best.transform === "identity") {
    return items;
  }

  return best.items;
}

/** Join description-only OCR lines with a following amount-only line. */
export function prejoinWrappedInvoiceLines(rawText: string): string {
  const lines = rawText.split("\n");
  const joined: string[] = [];
  let pendingLabel: string | null = null;

  for (const rawLine of lines) {
    const line = rawLine.replace(/\|/g, " ").replace(/\s+/g, " ").trim();
    if (!line) continue;

    if (AMOUNT_ONLY_LINE.test(line)) {
      if (pendingLabel) {
        joined.push(`${pendingLabel} ${line}`);
        pendingLabel = null;
      } else {
        joined.push(line);
      }
      continue;
    }

    const trailingAmount = line.match(
      /^(.*?)(?:\s+)(-?\d{1,3}(?:\.\d{3})*,\d{2}|-?\d+,\d{2})\s*$/,
    );
    if (trailingAmount?.[1]?.trim() && trailingAmount[2]) {
      if (pendingLabel) {
        joined.push(`${pendingLabel} ${line}`);
        pendingLabel = null;
      } else {
        joined.push(line);
      }
      continue;
    }

    if (pendingLabel) {
      pendingLabel = `${pendingLabel} ${line}`;
      continue;
    }

    pendingLabel = line;
  }

  if (pendingLabel) joined.push(pendingLabel);
  return joined.join("\n");
}
