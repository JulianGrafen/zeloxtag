/**
 * Heuristic Kilometerstand / Tachostand extraction from invoice OCR text.
 */

const MAX_KM = 9_999_999;
const MIN_PLAUSIBLE_KM = 500;

function parseKmDigits(raw: string): number | null {
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits || digits.length < 3 || digits.length > 7) return null;
  const value = Number.parseInt(digits, 10);
  if (!Number.isFinite(value) || value < MIN_PLAUSIBLE_KM || value > MAX_KM) {
    return null;
  }
  return value;
}

/**
 * Extract odometer reading (km) from German workshop invoice OCR.
 */
export function extractMileageKmFromText(rawText: string): number | null {
  const text = rawText.replace(/\r\n/g, "\n");

  const labeledPatterns = [
    /(?:kilometerstand|km[-\s]?stand|tachostand|odometer|laufleistung|kilometer)\s*[:.]?\s*([0-9][0-9.\s]{2,12})\s*(?:km)?/gi,
    /(?:bei|aktuell(?:er)?|aktueller)?\s*(?:km|kilometer)\s*[:.]?\s*([0-9][0-9.\s]{2,12})/gi,
    /(?:^|\n)\s*km\s*[:.]?\s*([0-9][0-9.\s]{2,12})\b/gi,
    /\b([0-9]{1,3}(?:[.\s][0-9]{3})+)\s*km\b/gi,
  ];

  for (const pattern of labeledPatterns) {
    for (const match of text.matchAll(pattern)) {
      const value = parseKmDigits(match[1] ?? "");
      if (value !== null) return value;
    }
  }

  // Fallback: "67210 km" / "67.210 km" near service wording, not money.
  for (const match of text.matchAll(
    /\b([0-9]{4,7}|[0-9]{1,3}(?:\.[0-9]{3})+)\s*km\b/gi,
  )) {
    const raw = match[1] ?? "";
    // Skip values that look like money (always have ,xx in DE invoices).
    if (/,\d{2}\b/.test(match[0])) continue;
    const value = parseKmDigits(raw);
    if (value === null) continue;
    const index = match.index ?? 0;
    const context = text.slice(Math.max(0, index - 40), index + match[0].length + 20);
    if (/(?:€|eur|mwst|preis|betrag|rechnung)/i.test(context)) continue;
    return value;
  }

  return null;
}

/** Prefer structured LLM mileage; fall back to OCR heuristic. */
export function preferMileageKm(
  structured: number | null | undefined,
  rawText: string,
): number | null {
  if (
    typeof structured === "number" &&
    Number.isFinite(structured) &&
    structured >= MIN_PLAUSIBLE_KM &&
    structured <= MAX_KM
  ) {
    return Math.round(structured);
  }
  return extractMileageKmFromText(rawText);
}
