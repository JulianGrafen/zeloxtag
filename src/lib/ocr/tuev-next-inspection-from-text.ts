/**
 * Extract next HU (Hauptuntersuchung) due month from TÜV report OCR text.
 * Returns YYYY-MM or null.
 */

const NEXT_HU_LABEL =
  /(?:n[aäe]+chste\s+(?:HU|Hauptuntersuchung)|HU\s+f[aäe]+llig|g[uüe]+ltig\s+bis|f[aäe]+lligkeit)\s*[:\s]\s*/i;

const DATE_CAPTURE =
  /(\d{1,2}[./-]\d{4}|\d{4}-\d{2}|\d{1,2}[./]\d{1,2}[./]\d{4})/;

function normalizeToYearMonth(raw: string): string | null {
  const trimmed = raw.trim();

  if (/^\d{4}-\d{2}$/.test(trimmed)) {
    const [year, month] = trimmed.split("-").map(Number);
    if (!year || !month || month < 1 || month > 12) return null;
    if (year < 1980 || year > 2100) return null;
    return trimmed;
  }

  const monthYear = trimmed.match(/^(\d{1,2})[./-](\d{4})$/);
  if (monthYear) {
    const month = Number.parseInt(monthYear[1]!, 10);
    const year = Number.parseInt(monthYear[2]!, 10);
    if (month < 1 || month > 12 || year < 1980 || year > 2100) return null;
    return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}`;
  }

  const dayMonthYear = trimmed.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
  if (dayMonthYear) {
    const month = Number.parseInt(dayMonthYear[2]!, 10);
    const year = Number.parseInt(dayMonthYear[3]!, 10);
    if (month < 1 || month > 12 || year < 1980 || year > 2100) return null;
    return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}`;
  }

  return null;
}

/**
 * Find labeled next-HU date variants in OCR text and normalize to YYYY-MM.
 */
export function extractTuevNextInspectionFromText(text: string): string | null {
  const labelMatch = text.match(
    new RegExp(`${NEXT_HU_LABEL.source}${DATE_CAPTURE.source}`, "i"),
  );
  if (labelMatch?.[1]) {
    const normalized = normalizeToYearMonth(labelMatch[1]);
    if (normalized) return normalized;
  }

  return null;
}
