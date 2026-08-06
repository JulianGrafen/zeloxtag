export const TEILEGUTACHTEN_OWNER_NOTES_MAX_LENGTH = 8_000;

const OWNER_NOTES_HEADING =
  /(?:^|\n)\s*(?:III\.\s*)?(?:Hinweise\s+für\s+(?:den\s+)?Fahrzeughalter|Hinweise)\b[^\n]*/i;

const OWNER_NOTES_SECTION_END =
  /\n\s*(?:IV\.\s|kennzeichnung\b|technische\s+daten\b|verwendungsbereich\b|unterschrift\b|genehmigungszeichen\b|anhang\b|(?:---+)?\s*seite\s+\d)/i;

/** Preserve OCR line breaks — only trim outer whitespace and cap length. */
export function normalizeTeilegutachtenOwnerNotes(
  value: string | null | undefined,
): string | null {
  if (!value?.trim()) return null;

  const normalized = value
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trim();

  if (normalized.length < 8) return null;
  return normalized.slice(0, TEILEGUTACHTEN_OWNER_NOTES_MAX_LENGTH);
}

function sliceOwnerNotesBody(text: string, start: number, headingLength: number): string {
  const tail = text.slice(start + headingLength);
  const endAt = tail.search(OWNER_NOTES_SECTION_END);
  return (endAt >= 0 ? tail.slice(0, endAt) : tail.slice(0, 20_000)).trim();
}

/**
 * Extract section III / "Hinweise für den Fahrzeughalter" verbatim from OCR text.
 */
export function extractTeilegutachtenOwnerNotesFromText(
  rawText: string,
): string | null {
  const text = rawText.replace(/\r\n/g, "\n").trim();
  if (text.length < 8) return null;

  const headingMatch = text.match(OWNER_NOTES_HEADING);
  if (headingMatch?.index !== undefined) {
    const body = sliceOwnerNotesBody(text, headingMatch.index, headingMatch[0].length);
    const normalized = normalizeTeilegutachtenOwnerNotes(body);
    if (normalized) return normalized;
  }

  const explicitMatch = text.match(
    /(?:^|\n)\s*Hinweise\s+für\s+(?:den\s+)?Fahrzeughalter\s*[:.]?\s*\n([\s\S]+?)(?=\n\s*IV\.)/i,
  );
  if (explicitMatch?.[1]) {
    return normalizeTeilegutachtenOwnerNotes(explicitMatch[1]);
  }

  return null;
}

/** Prefer the more complete owner-notes block from LLM vs heuristic OCR. */
export function mergeTeilegutachtenOwnerNotes(
  primary: string | null | undefined,
  fallback: string | null | undefined,
): string | null {
  const a = normalizeTeilegutachtenOwnerNotes(primary);
  const b = normalizeTeilegutachtenOwnerNotes(fallback);

  if (!a && !b) return null;
  if (!a) return b;
  if (!b) return a;
  return b.length > a.length ? b : a;
}
