/**
 * OCR-domain adapter for the "Extract & Compute" architecture.
 *
 * Validates raw LLM output against `LlmLineItemSchema` (Zod), then delegates
 * all number parsing and arithmetic to `@/utils/invoiceMath`.
 */

import { z } from "zod";

import type { InvoiceLineItem } from "@/lib/ocr/text-parse-schema";
import { parseGermanNumber, processLineItems } from "@/utils/invoiceMath";

// Re-export so existing call sites keep working without changes.
export { parseGermanNumber, processLineItems } from "@/utils/invoiceMath";

// ─── Zod schema for the raw LLM response ─────────────────────────────────────

/**
 * Schema for one line-item row as the LLM should return it.
 * All price/quantity fields are raw strings so the LLM never has to compute.
 */
export const LlmLineItemSchema = z.object({
  /** Position label — required, non-empty. */
  label: z.string().trim().min(1).max(200),
  /** Raw quantity text, e.g. "4", "7,00 Liter", "0,5". Null when column is blank. */
  menge: z.string().trim().nullable().optional(),
  /** Raw unit price text, e.g. "120,00". Null when column is blank. */
  einzelpreis: z.string().trim().nullable().optional(),
  /** Raw line total text, e.g. "480,00". Null when column is blank. */
  gesamtpreis: z.string().trim().nullable().optional(),
});

export type LlmRawLineItem = z.infer<typeof LlmLineItemSchema>;

// ─── Core checksum/fallback logic ─────────────────────────────────────────────

const ABSOLUTE_ROUNDING_TOLERANCE = 0.05; // €0.05 — covers multi-item rounding
const RELATIVE_ROUNDING_TOLERANCE = 0.002; // 0.2% — for larger amounts

/**
 * True when `computed` (qty × unit) and `reported` (Ges. Preis from document)
 * agree within acceptable rounding tolerance.
 */
function totalMatchesCheck(computed: number, reported: number): boolean {
  const absErr = Math.abs(computed - reported);
  const relErr = reported > 0 ? absErr / reported : absErr;
  return absErr <= ABSOLUTE_ROUNDING_TOLERANCE || relErr <= RELATIVE_ROUNDING_TOLERANCE;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Resolve a single raw line-item row to a final `InvoiceLineItem` with a
 * verified total price. Returns `null` when no price can be determined.
 *
 * Resolution order:
 * 1. Parse Menge (default to 1 when blank).
 * 2. Parse Einzelpreis and Ges. Preis.
 * 3. If only Einzelpreis → compute total = qty × unit.
 * 4. If only Ges. Preis → use directly.
 * 5. If both → cross-check: trust computed total if mismatch exceeds tolerance,
 *    otherwise keep the reported Ges. Preis (handles multi-unit rounding).
 */
export function computeLineItemTotal(raw: LlmRawLineItem): InvoiceLineItem | null {
  const quantity = parseGermanNumber(raw.menge) ?? 1;
  const unitPrice = parseGermanNumber(raw.einzelpreis);
  const reportedTotal = parseGermanNumber(raw.gesamtpreis);

  if (unitPrice === null && reportedTotal === null) return null;

  let amount: number;

  if (reportedTotal !== null && unitPrice !== null) {
    const computedTotal = roundMoney(quantity * unitPrice);
    // Trust document total unless qty × unit clearly contradicts it.
    amount = totalMatchesCheck(computedTotal, reportedTotal)
      ? reportedTotal
      : computedTotal;
  } else if (reportedTotal !== null) {
    // No Einzelpreis — use Ges. Preis directly.
    amount = reportedTotal;
  } else {
    // No Ges. Preis — calculate from Menge × Einzelpreis.
    // unitPrice is non-null here (first guard above rules out both-null).
    amount = roundMoney(quantity * unitPrice!);
  }

  return { label: raw.label, amount };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Convert a raw LLM line-item array (strings) into verified `InvoiceLineItem`
 * objects with correct totals. Pure, side-effect-free.
 */
export function parseAndVerifyLineItems(items: LlmRawLineItem[]): InvoiceLineItem[] {
  return items
    .map(computeLineItemTotal)
    .filter((item): item is InvoiceLineItem => item !== null);
}

/**
 * Parse an unknown array from the LLM response, validate each element against
 * `LlmLineItemSchema`, and compute verified totals. Returns null when the input
 * carries no parsable items.
 */
export function parseLlmRawLineItems(value: unknown): InvoiceLineItem[] | null {
  if (!Array.isArray(value)) return null;

  const valid: LlmRawLineItem[] = [];
  for (const item of value) {
    const result = LlmLineItemSchema.safeParse(item);
    if (result.success) valid.push(result.data);
  }

  const computed = parseAndVerifyLineItems(valid);
  return computed.length > 0 ? computed : null;
}
