/**
 * Prüfdatum extraction — Punkt 3 / (3) Prüftermin only.
 */

import { normalizeTuevOcrText } from "@/lib/ocr/tuev-ocr-normalize";

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
  /(?:\(?3\)?[\.)]?\s*)?(?:Prüftermin|Prüfort|Prüfdatum|Prüfungsdatum|Prüftag|Untersuchungsdatum|Untersuchungstag)|(?:Punkt|Feld)\s*3|3\.\s*Prüftermin/i;

const PUNKT3_CAPTURE =
  /(?:(?:\(?3\)?[\.)]?\s*)?(?:Prüftermin|Prüfort|Prüfdatum|Prüfungsdatum|Prüftag|Untersuchungsdatum|Untersuchungstag)|(?:Punkt|Feld)\s*3|3\.\s*Prüftermin)\s*[:\s]*(?:[^0-9]{0,60})?(\d{1,2}[./]\d{1,2}[./]\d{4}|\d{4}-\d{2}-\d{2})/gi;

const FORBIDDEN_DATE_LABEL =
  /Erstzulassung|\bEZ\b|Letzte\s+HU|Dat\.?\s*letzt\.?\s*HU|n[aä]chste\s+HU|Nachuntersuchung|Hauptuntersuchung\s+vom|Leistungsdatum|Rechnungsdatum|Belegdatum|Frist\s+bis|sp[aä]testens\s+bis/i;

function dateVariants(iso: string): string[] {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return [iso];
  const day = Number.parseInt(d, 10);
  const month = Number.parseInt(m, 10);
  return [
    iso,
    `${d}.${m}.${y}`,
    `${day}.${month}.${y}`,
    `${d.padStart(2, "0")}.${m}.${d.padStart(2, "0")}.${y}`,
  ];
}

function lineContainsDate(line: string, iso: string): boolean {
  return dateVariants(iso).some((variant) => line.includes(variant));
}

function dateNearForbiddenLabel(rawText: string, iso: string): boolean {
  for (const line of rawText.replace(/\r\n/g, "\n").split(/\n/)) {
    if (!FORBIDDEN_DATE_LABEL.test(line)) continue;
    if (lineContainsDate(line, iso)) return true;
  }
  return false;
}

function dateOnPunkt3Line(rawText: string, iso: string): boolean {
  for (const line of rawText.replace(/\r\n/g, "\n").split(/\n/)) {
    if (!PUNKT3_LABEL.test(line)) continue;
    if (lineContainsDate(line, iso)) return true;
  }
  return false;
}

function dateNearPunkt3Window(rawText: string, iso: string): boolean {
  const text = normalizeTuevOcrText(rawText);
  const punkt3Pattern =
    /(?:\(?3\)?[\.)]?\s*)?(?:Prüftermin|Prüfort|Prüfdatum|Prüfungsdatum|Prüftag|Untersuchungsdatum|Untersuchungstag)/gi;

  for (const match of text.matchAll(punkt3Pattern)) {
    if (match.index == null) continue;
    const window = text.slice(match.index, match.index + 120);
    if (dateVariants(iso).some((variant) => window.includes(variant))) {
      return true;
    }
  }

  return false;
}

function parseRawDateToken(raw: string): string | null {
  const trimmed = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed) && isValidCalendarDate(trimmed)) {
    return trimmed;
  }
  const de = trimmed.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
  if (!de) return null;
  return toIsoDate(
    Number.parseInt(de[1]!, 10),
    Number.parseInt(de[2]!, 10),
    Number.parseInt(de[3]!, 10),
  );
}

function extractDateFromTextWindow(text: string): string | null {
  for (const match of text.matchAll(
    /(\d{1,2}[./]\d{1,2}[./]\d{4}|\d{4}-\d{2}-\d{2})/g,
  )) {
    const iso = parseRawDateToken(match[1] ?? "");
    if (iso) return iso;
  }
  return null;
}

/** OCR often splits Punkt 3 label and date across adjacent lines. */
function extractTuevTestDateFromMultilinePunkt3(lines: string[]): string | null {
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]!.trim();
    if (!line) continue;
    const isPunkt3Line =
      PUNKT3_LABEL.test(line) || /^\(?3\)?[\.)]?\s/.test(line);
    if (!isPunkt3Line) continue;

    const inline = extractDateFromTextWindow(line);
    if (inline && !dateNearForbiddenLabel(lines.join("\n"), inline)) {
      return inline;
    }

    const window = lines.slice(index, index + 4).join(" ");
    const fromWindow = extractDateFromTextWindow(window);
    if (fromWindow && !dateNearForbiddenLabel(lines.join("\n"), fromWindow)) {
      return fromWindow;
    }
  }

  return null;
}

/** Extract test date strictly from Punkt 3 labels. */
export function extractTuevTestDateFromText(rawText: string): string | null {
  const text = normalizeTuevOcrText(rawText);

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

  const multiline = extractTuevTestDateFromMultilinePunkt3(lines);
  if (multiline) return multiline;

  return null;
}

/**
 * Prefer Punkt-3 OCR date over LLM vision. Reject LLM dates tied to forbidden
 * fields (Erstzulassung, nächste HU, …) when OCR text is available.
 */
export function preferTuevTestDate(
  structured: string | null | undefined,
  rawText: string,
): string | null {
  const ocrDate = rawText.trim() ? extractTuevTestDateFromText(rawText) : null;
  if (ocrDate) return ocrDate;

  const llmDate =
    typeof structured === "string" && /^\d{4}-\d{2}-\d{2}$/.test(structured.trim())
      ? structured.trim()
      : null;

  if (!llmDate) return null;
  if (!rawText.trim()) return llmDate;

  if (dateNearForbiddenLabel(rawText, llmDate)) return null;

  const loosePunkt3Date = extractLooseGermanDateNearPunkt3Marker(rawText);
  if (loosePunkt3Date) {
    if (loosePunkt3Date !== llmDate) return loosePunkt3Date;
    return llmDate;
  }

  if (dateOnPunkt3Line(rawText, llmDate)) return llmDate;
  if (dateNearPunkt3Window(rawText, llmDate)) return llmDate;
  if (llmDateNearPunkt3Marker(rawText, llmDate)) return llmDate;

  return llmDate;
}

function llmDateNearPunkt3Marker(rawText: string, iso: string): boolean {
  const text = normalizeTuevOcrText(rawText);
  const marker = /(?:\(?3\)?[\.)]?\s*)|(?:Punkt|Feld)\s*3\b/gi;

  for (const match of text.matchAll(marker)) {
    if (match.index == null) continue;
    const window = text.slice(match.index, match.index + 200);
    if (dateVariants(iso).some((variant) => window.includes(variant))) {
      return true;
    }
  }

  return false;
}

/** True when two ISO dates share a year but day/month are swapped (US vs DE). */
export function isLikelyDayMonthSwap(correctIso: string, swappedIso: string): boolean {
  const [y1, m1, d1] = correctIso.split("-").map(Number);
  const [y2, m2, d2] = swappedIso.split("-").map(Number);
  if (!y1 || !y2 || y1 !== y2 || m1 === m2) return false;
  return m1 === d2 && d1 === m2;
}

/**
 * Fallback when strict Punkt-3 label capture misses the date token but a German
 * DD.MM.YYYY still appears in the Punkt-3 window (common on noisy OCR layouts).
 */
function extractLooseGermanDateNearPunkt3Marker(rawText: string): string | null {
  const text = normalizeTuevOcrText(rawText);
  const marker =
    /(?:\(?3\)?[\.)]?\s*)|(?:Punkt|Feld)\s*3\b|(?:Prüftermin|Prüfort|Prüfdatum|Prüfungsdatum|Prüftag|Untersuchungsdatum)/gi;

  for (const match of text.matchAll(marker)) {
    if (match.index == null) continue;
    const window = text.slice(match.index, match.index + 200);
    for (const dateMatch of window.matchAll(/\b(\d{1,2})[./](\d{1,2})[./](\d{4})\b/g)) {
      const iso = parseRawDateToken(dateMatch[0] ?? "");
      if (!iso) continue;
      if (dateNearForbiddenLabel(rawText, iso)) continue;
      return iso;
    }
  }

  return null;
}
