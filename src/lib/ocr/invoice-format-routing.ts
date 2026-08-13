/**
 * Detect invoice table layout and route parsing (column vs section-based vs LLM-only).
 *
 * Routing uses only structural OCR signals (table headers, section titles) — never
 * vendor names, customer names, or line-item descriptions from the invoice body.
 */

import { isWorkshopSectionInvoiceText } from "@/lib/ocr/invoice-workshop-sections";

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

export function isColumnTableInvoiceText(rawText: string): boolean {
  return detectColumnTableSignals(rawText) >= 4;
}

/**
 * Column table vs Arbeitswerte/Ersatzteile sections vs unbekannt → LLM-only.
 */
export function detectInvoiceTableFormat(
  rawText: string | null | undefined,
): InvoiceTableFormat {
  const text = rawText?.trim() ?? "";
  if (!text) return "column";
  if (isWorkshopSectionInvoiceText(text)) return "workshop-sections";
  if (isColumnTableInvoiceText(text)) return "column";
  return "unknown";
}

export function isLlmOnlyInvoiceFormat(format: InvoiceTableFormat): boolean {
  return format === "unknown";
}

export function shouldMergeAzureLayout(format: InvoiceTableFormat): boolean {
  return format === "column";
}

export function shouldDrawInvoiceRowSeparators(
  format: InvoiceTableFormat,
): boolean {
  return format === "column";
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

/** Truncate noisy Azure OCR for LLM context. */
export function buildOcrHintForLlm(rawText: string, maxChars = 12_000): string {
  const normalized = rawText.replace(/\r\n/g, "\n").trim();
  if (normalized.length <= maxChars) return normalized;
  return normalized.slice(0, maxChars);
}

/** @deprecated Use {@link buildOcrHintForLlm} */
export const buildWorkshopOcrHint = buildOcrHintForLlm;
