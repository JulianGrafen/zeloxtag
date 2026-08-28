/**
 * Detect invoice table layout and route parsing (column vs section-based vs LLM-only).
 *
 * Routing uses only structural OCR signals (table headers, section titles) — never
 * vendor names, customer names, or line-item descriptions from the invoice body.
 */

import {
  detectWorkshopInvoiceSignals,
  isWorkshopSectionInvoiceText,
} from "@/lib/ocr/invoice-workshop-sections";

export type InvoiceTableFormat = "column" | "workshop-sections" | "unknown";

/** Pos | Menge | E-Preis | Ges. Preis column-table headers. */
export function detectColumnTableSignals(rawText: string): number {
  const lower = rawText.replace(/\r\n/g, "\n").toLowerCase();
  let score = 0;
  if (/\bges\.?\s*preis\b|\bgesamtpreis\b|\bg-?preis\b/.test(lower)) score += 3;
  if (/\be-?preis\b|\beinzelpreis\b/.test(lower)) score += 2;
  if (/\bmenge\b|\banzahl\b/.test(lower)) score += 1;
  if (/\bpos\.?\b|\bbezeichnung\b|\bbeschreibung\b|\bartikel\b/.test(lower)) score += 1;
  if (/\beinh\.?\b|\bst\.?\b/.test(lower)) score += 1;
  return score;
}

/**
 * Returns true when the text contains an explicit "Ges. Preis" / "Gesamtpreis"
 * column header.  This is the strongest signal for a proper column-table invoice
 * — section-based workshop invoices (Arbeitswerte/Ersatzteile) never use it.
 */
export function hasGesPreisColumn(rawText: string): boolean {
  const lower = rawText.replace(/\r\n/g, "\n").toLowerCase();
  return /\bges\.?\s*preis\b|\bgesamtpreis\b|\bg-?preis\b/.test(lower);
}

export function isColumnTableInvoiceText(rawText: string): boolean {
  return detectColumnTableSignals(rawText) >= 4;
}

/**
 * Column table vs Arbeitswerte/Ersatzteile sections vs unbekannt → LLM-only.
 *
 * An explicit "Ges. Preis" / "Gesamtpreis" column header is the strongest
 * signal for a proper column-table invoice and takes priority over workshop
 * section labels.  Many German workshops use BOTH structures on the same
 * invoice; routing them through the column pipeline (layout trust + geometry
 * correction) matches the proven 54d78144 behaviour where all invoices ran
 * through that path unconditionally.
 *
 * Section-only invoices that lack "Ges. Preis" (e.g. Speedworkz) still route
 * to the workshop path.
 */
export function detectInvoiceTableFormat(
  rawText: string | null | undefined,
): InvoiceTableFormat {
  const text = rawText?.trim() ?? "";
  if (!text) return "column";
  // Explicit Ges.-Preis column → always the tabular pipeline.
  if (hasGesPreisColumn(text)) return "column";
  // Section invoices (Arbeitswerte / Ersatzteile / Preis-€ / Positionssumme)
  // even when Einzelpreis appears in the parts block.
  if (
    isWorkshopSectionInvoiceText(text) ||
    detectWorkshopInvoiceSignals(text) >= 4
  ) {
    return "workshop-sections";
  }
  // Generic column table (score ≥ 4 but no explicit Ges.-Preis).
  if (isColumnTableInvoiceText(text)) return "column";
  return "unknown";
}

export function isLlmOnlyInvoiceFormat(format: InvoiceTableFormat): boolean {
  return format === "unknown";
}

export function shouldMergeAzureLayout(format: InvoiceTableFormat): boolean {
  return format === "column";
}

/**
 * Always draw row guides when geometry exists — same as the proven path at
 * 54d78144 (vision LLM + horizontal separators). Format gating previously
 * skipped overlays for workshop/unknown layouts and caused row-shift regressions.
 */
export function shouldDrawInvoiceRowSeparators(
  _format: InvoiceTableFormat,
): boolean {
  return true;
}

export function shouldReconcileWithOcrHeuristics(
  format: InvoiceTableFormat,
): boolean {
  return (
    format === "column" ||
    format === "workshop-sections" ||
    format === "unknown"
  );
}

export function shouldRealignLineItems(format: InvoiceTableFormat): boolean {
  return format === "column";
}

/** Wrapped Pos-table description merge — never on section invoices. */
export function shouldMergeContinuationLineItems(
  format: InvoiceTableFormat,
): boolean {
  return format === "column";
}

/** Truncate noisy Azure OCR for LLM context. */
export function buildOcrHintForLlm(rawText: string, maxChars = 12_000): string {
  const normalized = rawText.replace(/\r\n/g, "\n").trim();
  if (normalized.length <= maxChars) return normalized;
  return normalized.slice(0, maxChars);
}

/** @deprecated Use {@link buildOcrHintForLlm} */
export const buildWorkshopOcrHint = buildOcrHintForLlm;
