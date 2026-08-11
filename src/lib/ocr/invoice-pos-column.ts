/**
 * Pos-column anchors for German workshop invoice tables (Pos 1, 2, 3 …).
 * Used when OCR glues multiple rows into one line.
 */

const POS_TABLE_HEADER =
  /\bpos\.?\b[\s\S]{0,120}\b(?:bezeichnung|beschreibung|nummer|menge|ges\.?\s*preis)\b/i;

/** True when OCR shows a classic Pos | Nummer | Bezeichnung table. */
export function ocrTextUsesPosColumnTable(rawText: string): boolean {
  const text = rawText.replace(/\r\n/g, "\n");
  if (POS_TABLE_HEADER.test(text)) return true;
  return (
    /\bpos\.?\s+nummer\b/i.test(text) ||
    /\bpos\.?\s+bezeichnung\b/i.test(text)
  );
}

/**
 * Pos cell: small integer at row start — never a Menge decimal like "1,63".
 * Followed by Nummer (digits) or description text.
 */
const POS_ROW_MARKER =
  /(?:^|\s)(\d{1,2})(?=\s+(?:\d{4,}\s+|[A-Za-zÄÖÜäöüß§(]))/g;

function markerStartIndex(line: string, match: RegExpMatchArray): number {
  const raw = match[0] ?? "";
  const leadingSpace = raw.startsWith(" ") || raw.startsWith("\t") ? 1 : 0;
  return (match.index ?? 0) + leadingSpace;
}

/** Find split indices where a new Pos row begins (sequential 1, 2, 3 …). */
export function findPosColumnSplitStarts(line: string): number[] {
  const starts: number[] = [];
  let expectedPos = 1;

  for (const match of line.matchAll(POS_ROW_MARKER)) {
    const pos = Number.parseInt(match[1] ?? "", 10);
    if (!Number.isFinite(pos) || pos < 1 || pos > 60) continue;

    if (pos !== expectedPos) {
      if (pos === 1 && starts.length === 0) {
        expectedPos = 1;
      } else {
        continue;
      }
    }

    starts.push(markerStartIndex(line, match));
    expectedPos = pos + 1;
  }

  return starts;
}

/** Split one glued OCR line into one segment per Pos row. */
export function splitLineByPosColumn(line: string): string[] {
  const trimmed = line.replace(/[^\S\n]+/g, " ").trim();
  if (trimmed.length < 4) return [];

  const starts = findPosColumnSplitStarts(trimmed);
  if (starts.length <= 1) return [trimmed];

  const segments: string[] = [];
  for (let index = 0; index < starts.length; index += 1) {
    const start = starts[index]!;
    const end = index + 1 < starts.length ? starts[index + 1]! : trimmed.length;
    const segment = trimmed.slice(start, end).trim();
    if (segment.length >= 4) segments.push(segment);
  }

  return segments.length > 0 ? segments : [trimmed];
}

/** Drop leading Pos and optional Nummer columns from a row label. */
export function stripPosColumnPrefix(label: string): string {
  let trimmed = label.trim();
  trimmed = trimmed.replace(/^\d{1,2}\s+/, "");
  trimmed = trimmed.replace(/^\d{4,9}\s+/, "");
  return trimmed.trim();
}
