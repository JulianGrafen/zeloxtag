import type { TeilegutachtenExtraction } from "@/lib/validations/teilegutachtenSchema";

export const TEILEGUTACHTEN_MODIFICATION_TYPE_MAX_LENGTH = 2_000;

const MODIFICATION_TYPE_INLINE =
  /(?:^|\n)\s*Art\s+der\s+Umr[uü][sß]tung\b\s*(?:[:\-|]\s*|\|\s*)([^\n|]+)/i;

const MODIFICATION_TYPE_PIPE_ROW =
  /\|\s*Art\s+der\s+Umr[uü][sß]tung\s*\|\s*([^|\n]+?)\s*\|/i;

const MODIFICATION_TYPE_HEADING =
  /(?:^|\n)\s*Art\s+der\s+Umr[uü][sß]tung\b\s*(?:[:\-|]\s*([^\n|]+))?\s*(?:\n|$)/i;

const MODIFICATION_TYPE_SECTION_END =
  /\n\s*(?:Hersteller|Bezeichnung|Typ(?:en)?(?:bezeichnung|schlüssel)?|Kennzeichnung|Gutachten|Verwendungsbereich|Technische\s+Daten|Prüforganisation)\b/i;

const MODIFICATION_TYPE_LINE_STOP =
  /^(?:Hersteller|Bezeichnung|Typ(?:en)?(?:bezeichnung|schlüssel)?|Kennzeichnung|Gutachten|Verwendungsbereich|Technische\s+Daten|Prüforganisation)\b/i;

/** Preserve OCR line breaks — only trim outer whitespace and cap length. */
export function normalizeTeilegutachtenModificationType(
  value: string | null | undefined,
): string | null {
  if (!value?.trim()) return null;

  const normalized = value
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trim()
    .slice(0, TEILEGUTACHTEN_MODIFICATION_TYPE_MAX_LENGTH);

  if (normalized.length < 2) return null;
  if (/^art\s+der\s+umr/i.test(normalized)) return null;
  return normalized;
}

function normalizeInlineModificationType(value: string): string | null {
  const trimmed = value
    .replace(/\r\n/g, "\n")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[-•*]\s*/, "")
    .replace(/\.$/, "");

  return normalizeTeilegutachtenModificationType(trimmed);
}

function bodyLinesToModificationType(body: string): string | null {
  const lines: string[] = [];

  for (const rawLine of body.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    if (MODIFICATION_TYPE_LINE_STOP.test(line)) break;
    if (/^art\s+der\s+umr/i.test(line)) continue;
    lines.push(line.replace(/^[-•*]\d*\.?\s*/, ""));
  }

  if (lines.length === 0) return null;
  return normalizeTeilegutachtenModificationType(lines.join("\n"));
}

/**
 * Extract "Art der Umrüstung" from Teilegutachten OCR text (cover / header block).
 * Captures the full multi-line block until the next header field.
 */
export function extractTeilegutachtenModificationTypeFromText(
  rawText: string,
): string | null {
  const text = rawText.replace(/\r\n/g, "\n").trim();
  if (text.length < 8) return null;

  const headingMatch = text.match(MODIFICATION_TYPE_HEADING);
  if (headingMatch?.index !== undefined) {
    const inlineValue = headingMatch[1]?.trim();
    const tail = text.slice(headingMatch.index + headingMatch[0].length);
    const endAt = tail.search(MODIFICATION_TYPE_SECTION_END);
    const body = (endAt >= 0 ? tail.slice(0, endAt) : tail.slice(0, 2_500)).trim();

    const fromBody = bodyLinesToModificationType(body);
    if (fromBody) return fromBody;

    if (inlineValue) {
      const fromInline = normalizeInlineModificationType(inlineValue);
      if (fromInline) return fromInline;
    }
  }

  const inlineMatch = text.match(MODIFICATION_TYPE_INLINE);
  if (inlineMatch?.[1]) {
    const normalized = normalizeInlineModificationType(inlineMatch[1]);
    if (normalized) return normalized;
  }

  const pipeMatch = text.match(MODIFICATION_TYPE_PIPE_ROW);
  if (pipeMatch?.[1]) {
    const normalized = normalizeInlineModificationType(pipeMatch[1]);
    if (normalized) return normalized;
  }

  return null;
}

/** Prefer the more complete Art der Umrüstung block from LLM vs OCR heuristic. */
export function mergeTeilegutachtenModificationType(
  primary: string | null | undefined,
  fallback: string | null | undefined,
): string | null {
  const a = normalizeTeilegutachtenModificationType(primary);
  const b = normalizeTeilegutachtenModificationType(fallback);

  if (!a && !b) return null;
  if (!a) return b;
  if (!b) return a;
  if (b.length > a.length) return b;
  if (a.length > b.length && !a.includes(b)) return a;
  return a;
}

/** Fill or extend modificationType from OCR when the LLM returned a truncated block. */
export function enrichTeilegutachtenModificationTypeFromOcr(
  extracted: TeilegutachtenExtraction,
  ocrText: string,
): TeilegutachtenExtraction {
  const fromOcr = extractTeilegutachtenModificationTypeFromText(ocrText);
  const merged = mergeTeilegutachtenModificationType(
    extracted.modificationType,
    fromOcr,
  );

  if (!merged || merged === extracted.modificationType) {
    return extracted;
  }

  return { ...extracted, modificationType: merged };
}
