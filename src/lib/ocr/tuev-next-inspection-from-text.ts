/**
 * Extract next HU (Hauptuntersuchung) due month from TÜV report OCR text.
 * Returns YYYY-MM or null.
 */

import { normalizeTuevOcrText } from "@/lib/ocr/tuev-ocr-normalize";

const GERMAN_MONTHS: Readonly<Record<string, number>> = {
  januar: 1,
  jan: 1,
  februar: 2,
  feb: 2,
  marz: 3,
  märz: 3,
  maerz: 3,
  april: 4,
  apr: 4,
  mai: 5,
  juni: 6,
  jun: 6,
  juli: 7,
  jul: 7,
  august: 8,
  aug: 8,
  september: 9,
  sep: 9,
  sept: 9,
  oktober: 10,
  okt: 10,
  november: 11,
  nov: 11,
  dezember: 12,
  dez: 12,
};

/** Contexts that mention dates but are not the next HU term. */
const EXCLUDE_NEAR_LABEL =
  /(?:nachprüfung|nachpruefung|beseitigung(?:\s+aller)?\s+mängel|spätestens|spaetestens|begrüßen|begruessen|zur\s+nächsten\s+untersuchung\s+erneut)/i;

/**
 * OCR-tolerant inspection-type suffix (HU, Hauptuntersuchung, Untersuchung).
 * `unter(?:t)?suchung` matches Untertsuchung; `unlersuchung` matches l/t OCR swaps.
 */
const INSPECTION_LABEL =
  "(?:hu|hauptuntersuchung|unter(?:t)?suchung|unlersuchung)";

/**
 * OCR-tolerant next-HU labels (priority order — first match wins).
 * `n[aäe]{0,2}chste` matches nächste / naechste / nachste / nchste.
 */
const NEXT_HU_LABEL_PATTERNS: readonly RegExp[] = [
  new RegExp(
    `(?:termin\\s+(?:der\\s+)?n[aäe]{0,2}chsten?\\s+${INSPECTION_LABEL})`,
    "gi",
  ),
  new RegExp(
    `(?:datum\\s+(?:der\\s+)?n[aäe]{0,2}chsten?\\s+${INSPECTION_LABEL})`,
    "gi",
  ),
  /(?:f[aäe]lligkeit(?:stermin)?(?:\s+(?:der\s+)?n[aäe]{0,2}chsten?\s+(?:hu|unter(?:t)?suchung|unlersuchung))?)/gi,
  new RegExp(`(?:n[aäe]{0,2}chsten?\\s+${INSPECTION_LABEL})`, "gi"),
  /(?:f[aäe]llige?\s+unter(?:t)?suchung)/gi,
  /(?:hu[\s-]*termin|hu[\s-]*f[aäe]llig)/gi,
  /(?:(?:prüf|pruef)?plakette\s+g[uüe]{0,2}ltig\s+bis)/gi,
  /(?:g[uüe]{0,2}ltig\s+bis)/gi,
];

const NEXT_HU_LINE_LABEL = new RegExp(
  `(?:termin\\s+(?:der\\s+)?n[aäe]{0,2}chsten?\\s+${INSPECTION_LABEL}|n[aäe]{0,2}chsten?\\s+${INSPECTION_LABEL}|f[aäe]llige?\\s+unter(?:t)?suchung|hu[\\s-]*(?:termin|f[aäe]llig)|f[aäe]lligkeit(?:stermin)?|(?:prüf|pruef)?plakette\\s+g[uüe]{0,2}ltig\\s+bis|g[uüe]{0,2}ltig\\s+bis)`,
  "i",
);

const NUMERIC_DATE =
  /(\d{1,2}\s*[./-]\s*\d{4}|\d{4}\s*-\s*\d{2}|\d{1,2}\s*[./]\s*\d{1,2}\s*[./]\s*\d{4})/;

const MONTH_NAME_DATE =
  /([A-Za-zäöüÄÖÜß]{3,12})\s+(\d{4})/;

function foldGerman(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/ß/g, "ss")
    .toLowerCase();
}

function normalizeToYearMonth(raw: string): string | null {
  const trimmed = raw.trim().replace(/\s+/g, "");

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

function parseMonthNameDate(fragment: string): string | null {
  const match = fragment.match(MONTH_NAME_DATE);
  if (!match?.[1] || !match[2]) return null;

  const month = GERMAN_MONTHS[foldGerman(match[1])];
  const year = Number.parseInt(match[2], 10);
  if (!month || year < 1980 || year > 2100) return null;

  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}`;
}

function shouldSkipLabelContext(before: string, label: string, after: string): boolean {
  const context = `${before.slice(-50)} ${label} ${after.slice(0, 40)}`;
  return EXCLUDE_NEAR_LABEL.test(context);
}

function extractDateFromFragment(fragment: string): string | null {
  const cleaned = fragment
    .trim()
    .replace(/^[:\s|—–-]+/, "")
    .trim();
  if (!cleaned) return null;

  const numeric = cleaned.match(NUMERIC_DATE);
  if (numeric?.[1]) {
    const normalized = normalizeToYearMonth(numeric[1]);
    if (normalized) return normalized;
  }

  return parseMonthNameDate(cleaned);
}

function extractDateAfterIndex(text: string, startIndex: number): string | null {
  const inlineWindow = text.slice(startIndex, startIndex + 100);
  const inline = extractDateFromFragment(inlineWindow);
  if (inline) return inline;

  const lines = text.slice(startIndex).split("\n");
  for (let index = 1; index <= 3 && index < lines.length; index += 1) {
    const line = lines[index]?.trim() ?? "";
    if (!line || line.length > 48) continue;
    if (EXCLUDE_NEAR_LABEL.test(line)) continue;
    if (/^(?:ergebnis|hinweis|unterschrift|seite)\b/i.test(line)) break;

    const date = extractDateFromFragment(line);
    if (date) return date;
  }

  return null;
}

function extractFromLabelPatterns(text: string): string | null {
  for (const pattern of NEXT_HU_LABEL_PATTERNS) {
    pattern.lastIndex = 0;
    for (const match of text.matchAll(pattern)) {
      if (match.index == null) continue;

      const before = text.slice(Math.max(0, match.index - 60), match.index);
      const afterStart = match.index + match[0].length;
      const after = text.slice(afterStart, afterStart + 60);
      if (shouldSkipLabelContext(before, match[0], after)) continue;

      const date = extractDateAfterIndex(text, afterStart);
      if (date) return date;
    }
  }

  return null;
}

function extractFromMultilineBlocks(text: string): string | null {
  const lines = text.split("\n");

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]!.trim();
    if (!line || !NEXT_HU_LINE_LABEL.test(line)) continue;
    if (EXCLUDE_NEAR_LABEL.test(line)) continue;

    const afterLabel = line.replace(NEXT_HU_LINE_LABEL, "");
    const sameLine = extractDateFromFragment(afterLabel);
    if (sameLine) return sameLine;

    for (let offset = 1; offset <= 3 && index + offset < lines.length; offset += 1) {
      const nextLine = lines[index + offset]!.trim();
      if (!nextLine || nextLine.length > 48) continue;
      if (EXCLUDE_NEAR_LABEL.test(nextLine)) continue;
      if (/^(?:ergebnis|festgestellte|mängel|hinweis)\b/i.test(nextLine)) break;

      const date = extractDateFromFragment(nextLine);
      if (date) return date;
    }
  }

  return null;
}

/**
 * Find labeled next-HU date variants in OCR text and normalize to YYYY-MM.
 */
export function extractTuevNextInspectionFromText(text: string): string | null {
  const normalized = normalizeTuevOcrText(text);

  return (
    extractFromLabelPatterns(normalized) ??
    extractFromMultilineBlocks(normalized)
  );
}

/** Prefer OCR next-HU label; LLM sometimes picks Nachprüfung deadlines. */
export function preferTuevNextInspectionDate(
  structured: string | null | undefined,
  rawText: string,
): string | null {
  const ocrDate = rawText.trim()
    ? extractTuevNextInspectionFromText(rawText)
    : null;
  if (ocrDate) return ocrDate;

  const llmDate =
    typeof structured === "string" && /^\d{4}-\d{2}$/.test(structured.trim())
      ? structured.trim()
      : null;

  return llmDate;
}
