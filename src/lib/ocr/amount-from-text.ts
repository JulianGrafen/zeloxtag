import { sumLineItems } from "@/lib/documents/line-items";
import type { DocumentLineItem } from "@/types/database";

/**
 * Heuristic gross-total extraction from German workshop invoice OCR.
 */

const MAX_AMOUNT = 250_000;
const MIN_AMOUNT = 1;

function parseEurAmount(raw: string): number | null {
  const cleaned = raw
    .replace(/\s/g, "")
    .replace(/€|eur/gi, "")
    .trim();
  if (!cleaned) return null;

  // 1.234,56 / 1234,56 / 1,234.56 / 1234.56
  let normalized = cleaned;
  if (/\d,\d{2}$/.test(cleaned) && cleaned.includes(".")) {
    normalized = cleaned.replace(/\./g, "").replace(",", ".");
  } else if (/\d,\d{2}$/.test(cleaned)) {
    normalized = cleaned.replace(",", ".");
  } else if (/\d\.\d{2}$/.test(cleaned) && cleaned.includes(",")) {
    normalized = cleaned.replace(/,/g, "");
  }

  const value = Number.parseFloat(normalized);
  if (!Number.isFinite(value) || value < MIN_AMOUNT || value > MAX_AMOUNT) {
    return null;
  }
  return Math.round(value * 100) / 100;
}

/**
 * Extract invoice gross total (EUR) from OCR text.
 */
export function extractAmountFromText(rawText: string): number | null {
  const text = rawText.replace(/\r\n/g, "\n");

  const labeledPatterns = [
    /(?:rechnungsbetrag|zahlbetrag|gesamtbetrag|bruttobetrag|endbetrag|zu\s*zahlen|summe|gesamt|total|betrag)\s*[:.]?\s*([0-9][0-9.\s,]{0,14})\s*(?:€|eur)?/gi,
    /(?:€|eur)\s*([0-9][0-9.\s,]{0,14})\s*(?:gesamt|brutto|total)?/gi,
  ];

  const candidates: number[] = [];
  for (const pattern of labeledPatterns) {
    for (const match of text.matchAll(pattern)) {
      const value = parseEurAmount(match[1] ?? "");
      if (value !== null) candidates.push(value);
    }
  }

  if (candidates.length > 0) {
    return Math.max(...candidates);
  }

  // Fallback: rightmost plausible € amounts on "Summe/Gesamt" lines.
  for (const line of text.split("\n")) {
    if (!/(?:summe|gesamt|brutto|zahlbetrag|rechnungsbetrag|total)/i.test(line)) {
      continue;
    }
    const amounts = [...line.matchAll(/([0-9]{1,3}(?:\.[0-9]{3})*,\d{2}|[0-9]+,\d{2}|[0-9]+\.\d{2})/g)]
      .map((match) => parseEurAmount(match[1] ?? ""))
      .filter((value): value is number => value !== null);
    if (amounts.length > 0) {
      candidates.push(Math.max(...amounts));
    }
  }

  return candidates.length > 0 ? Math.max(...candidates) : null;
}

/** Prefer structured LLM amount; fall back to OCR heuristic / line-item sum. */
export function preferAmount(
  structured: number | null | undefined,
  rawText: string,
  lineItems?: DocumentLineItem[] | null,
): number | null {
  if (
    typeof structured === "number" &&
    Number.isFinite(structured) &&
    structured >= MIN_AMOUNT &&
    structured <= MAX_AMOUNT
  ) {
    return Math.round(structured * 100) / 100;
  }

  const fromText = extractAmountFromText(rawText);
  if (fromText !== null) return fromText;

  return sumLineItems(lineItems ?? null);
}
