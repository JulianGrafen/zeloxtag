export const TEILEGUTACHTEN_MODIFICATION_TYPE_MAX_LENGTH = 120;

const MODIFICATION_TYPE_INLINE =
  /(?:^|\n)\s*Art\s+der\s+Umr[uü][sß]tung\b\s*(?:[:\-|]\s*|\|\s*)([^\n|]+)/i;

const MODIFICATION_TYPE_PIPE_ROW =
  /\|\s*Art\s+der\s+Umr[uü][sß]tung\s*\|\s*([^|\n]+?)\s*\|/i;

const MODIFICATION_TYPE_HEADING =
  /(?:^|\n)\s*Art\s+der\s+Umr[uü][sß]tung\b\s*(?:\n|$)/i;

const MODIFICATION_TYPE_SECTION_END =
  /\n\s*(?:Hersteller|Bezeichnung|Typ(?:en)?(?:bezeichnung|schlüssel)?|Kennzeichnung|Gutachten|Verwendungsbereich|Technische\s+Daten|Prüforganisation)\b/i;

function normalizeModificationType(value: string): string | null {
  const trimmed = value
    .replace(/\r\n/g, "\n")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[-•*]\s*/, "")
    .replace(/\.$/, "")
    .slice(0, TEILEGUTACHTEN_MODIFICATION_TYPE_MAX_LENGTH);

  if (trimmed.length < 2) return null;
  if (/^art\s+der\s+umr/i.test(trimmed)) return null;
  return trimmed;
}

/**
 * Extract "Art der Umrüstung" from Teilegutachten OCR text (cover / header block).
 */
export function extractTeilegutachtenModificationTypeFromText(
  rawText: string,
): string | null {
  const text = rawText.replace(/\r\n/g, "\n").trim();
  if (text.length < 8) return null;

  const inlineMatch = text.match(MODIFICATION_TYPE_INLINE);
  if (inlineMatch?.[1]) {
    const normalized = normalizeModificationType(inlineMatch[1]);
    if (normalized) return normalized;
  }

  const pipeMatch = text.match(MODIFICATION_TYPE_PIPE_ROW);
  if (pipeMatch?.[1]) {
    const normalized = normalizeModificationType(pipeMatch[1]);
    if (normalized) return normalized;
  }

  const headingMatch = text.match(MODIFICATION_TYPE_HEADING);
  if (headingMatch?.index !== undefined) {
    const tail = text.slice(headingMatch.index + headingMatch[0].length);
    const endAt = tail.search(MODIFICATION_TYPE_SECTION_END);
    const body = (endAt >= 0 ? tail.slice(0, endAt) : tail.slice(0, 600)).trim();

    for (const line of body.split("\n")) {
      const normalized = normalizeModificationType(line);
      if (normalized) return normalized;
    }
  }

  return null;
}

/** Prefer explicit LLM value; fall back to OCR heuristic. */
export function mergeTeilegutachtenModificationType(
  primary: string | null | undefined,
  fallback: string | null | undefined,
): string | null {
  const normalizedPrimary = primary?.trim()
    ? normalizeModificationType(primary)
    : null;
  const normalizedFallback = fallback?.trim()
    ? normalizeModificationType(fallback)
    : null;

  return normalizedPrimary ?? normalizedFallback;
}
