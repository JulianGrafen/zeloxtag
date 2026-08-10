/**
 * Prüfdatum extraction — Punkt 3 / (3) Prüftermin only.
 */

function isValidCalendarDate(iso: string): boolean {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return false;
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  if (y < 1980 || y > 2100) return false;
  const date = new Date(Date.UTC(y, m - 1, d));
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d
  );
}

function toIsoDate(day: number, month: number, year: number): string | null {
  const iso = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return isValidCalendarDate(iso) ? iso : null;
}

const PUNKT3_LABEL =
  /(?:\(?3\)?[\.)]?\s*)?(?:Prüftermin|Prüfort|Prüfdatum|Prüftag)|(?:Punkt|Feld)\s*3|3\.\s*Prüftermin/i;

const PUNKT3_CAPTURE =
  /(?:(?:\(?3\)?[\.)]?\s*)?(?:Prüftermin|Prüfort|Prüfdatum|Prüftag)|(?:Punkt|Feld)\s*3|3\.\s*Prüftermin)\s*[:\s]*(?:[^0-9]{0,60})?(\d{1,2}[./]\d{1,2}[./]\d{4}|\d{4}-\d{2}-\d{2})/gi;

/** Extract test date strictly from Punkt 3 labels. */
export function extractTuevTestDateFromText(rawText: string): string | null {
  const text = rawText.replace(/\r\n/g, "\n");

  for (const match of text.matchAll(PUNKT3_CAPTURE)) {
    const raw = match[1]?.trim();
    if (!raw) continue;
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw) && isValidCalendarDate(raw)) {
      return raw;
    }
    const de = raw.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
    if (!de) continue;
    const iso = toIsoDate(
      Number.parseInt(de[1]!, 10),
      Number.parseInt(de[2]!, 10),
      Number.parseInt(de[3]!, 10),
    );
    if (iso) return iso;
  }

  const lines = text.split(/\n/);
  for (const line of lines) {
    if (!PUNKT3_LABEL.test(line)) continue;
    const inline = line.match(/(\d{1,2}[./]\d{1,2}[./]\d{4}|\d{4}-\d{2}-\d{2})/);
    if (!inline) continue;
    const raw = inline[1]!;
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw) && isValidCalendarDate(raw)) {
      return raw;
    }
    const de = raw.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
    if (!de) continue;
    const iso = toIsoDate(
      Number.parseInt(de[1]!, 10),
      Number.parseInt(de[2]!, 10),
      Number.parseInt(de[3]!, 10),
    );
    if (iso) return iso;
  }

  return null;
}
