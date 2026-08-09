/**
 * "Extract & Compute" architecture for invoice line items.
 *
 * The LLM is instructed to output raw strings from each column (Menge,
 * Einzelpreis, Ges. Preis) — no math, no guessing. TypeScript then parses
 * German number formats and applies a strict checksum/fallback to produce a
 * reliable total price per item.
 */

import { z } from "zod";

import type { InvoiceLineItem } from "@/lib/ocr/text-parse-schema";

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

// ─── Number parsing ───────────────────────────────────────────────────────────

/**
 * Parse a German-formatted number string into a JS number.
 *
 * Handles:
 * - "1.234,56"  → 1234.56  (thousands dot + decimal comma)
 * - "141,46"    → 141.46   (decimal comma only)
 * - "1.000"     → 1000     (thousands dot, no decimal)
 * - "141.60"    → 141.6    (LLM US-style decimal dot)
 * - "7,00 Liter"→ 7.0      (trailing unit text stripped)
 * - "4 Stk."   → 4        (trailing unit text stripped)
 */
export function parseGermanNumber(val: string | null | undefined): number | null {
  if (!val?.trim()) return null;

  // Strip trailing non-numeric unit text (e.g. " Liter", " Stk.", " h", " %").
  const stripped = val.trim().replace(/\s+[a-zA-ZäöüÄÖÜß%][^\d,.\s]*$/, "").trim();
  if (!stripped) return null;

  // Remove currency symbols and non-breaking spaces.
  const cleaned = stripped.replace(/[€$\u00a0]/g, "").trim();
  if (!cleaned || cleaned === "-") return null;

  // Reject pure percentage values (e.g. "19%", "7,7%").
  if (/^-?\d+([.,]\d+)?%$/.test(cleaned)) return null;

  const hasComma = cleaned.includes(",");
  const hasDot = cleaned.includes(".");

  let normalized: string;

  if (hasComma && hasDot) {
    // "1.234,56" → German: dot = thousands separator, comma = decimal.
    normalized = cleaned.replace(/\./g, "").replace(",", ".");
  } else if (hasComma) {
    // "141,46" → comma is the decimal separator.
    normalized = cleaned.replace(",", ".");
  } else if (hasDot) {
    // Ambiguous: "1.000" (German thousands) vs "1.60" (US decimal).
    const dotParts = cleaned.split(".");
    const afterDot = dotParts[dotParts.length - 1] ?? "";
    if (afterDot.length === 3 && dotParts.length >= 2) {
      // "1.000" or "1.234.567" — thousands separator(s), no decimal.
      normalized = cleaned.replace(/\./g, "");
    } else {
      // "1.6" or "141.60" — US-style decimal.
      normalized = cleaned;
    }
  } else {
    // Plain integer: "4", "120".
    normalized = cleaned;
  }

  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 100000) / 100000 : null;
}

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
