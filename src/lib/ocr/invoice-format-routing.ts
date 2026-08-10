/**
 * Detect invoice table layout and route parsing (column vs section-based).
 */

import { isWorkshopSectionInvoiceText } from "@/lib/ocr/invoice-workshop-sections";

export type InvoiceTableFormat = "column" | "workshop-sections";

/** Column table (Pos | Menge | E-Preis | Ges. Preis) vs Arbeitswerte/Ersatzteile sections. */
export function detectInvoiceTableFormat(
  rawText: string | null | undefined,
): InvoiceTableFormat {
  if (rawText?.trim() && isWorkshopSectionInvoiceText(rawText)) {
    return "workshop-sections";
  }
  return "column";
}

export function shouldMergeAzureLayout(format: InvoiceTableFormat): boolean {
  return format === "column";
}

export function shouldDrawInvoiceRowSeparators(
  format: InvoiceTableFormat,
): boolean {
  return format === "column";
}

/** Truncate noisy Azure OCR for LLM context. */
export function buildWorkshopOcrHint(rawText: string, maxChars = 12_000): string {
  const normalized = rawText.replace(/\r\n/g, "\n").trim();
  if (normalized.length <= maxChars) return normalized;
  return normalized.slice(0, maxChars);
}
