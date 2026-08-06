import {
  groupTeilegutachtenAuflagen,
  isAuflageSectionHeading,
} from "@/lib/validations/teilegutachten-auflagen";
import { TEILEGUTACHTEN_AUFLAGEN_MAX_LENGTH } from "@/lib/validations/teilegutachtenSchema";

const TGA_AUFLAGEN_SECTION =
  /(?:^|\n)\s*IV\.\s*[^\n]*/gi;

const AUFLAGEN_INLINE =
  /(?:^|\n)\s*((?:besondere\s+)?auflagen(?:\s*(?:\/|,|und)\s*hinweise?)?)\s*[:.]?\s*([^\n]{12,4000})/i;

const SECTION_END =
  /\n\s*(?:(?:V|VI)\.\s|kennzeichnung\b|technische\s+daten\b|verwendungsbereich\b|unterschrift\b|genehmigungszeichen\b|anhang\b|(?:---+)?\s*seite\s+\d)/i;

const SKIP_LINE =
  /^(?:III|IV|V|VI)\.\s|^(?:hinweise|auflagen)\s*$|^(?:seite|page)\s+\d/i;

function stripListMarker(line: string): string {
  return line.replace(/^[-•*–—]\s*/, "").replace(/^\d+[.)]\s*/, "").trim();
}

function normalizeAuflageKey(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim().slice(0, 120);
}

function dedupeAuflagen(items: string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const item of items) {
    const key = normalizeAuflageKey(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(item.trim().slice(0, TEILEGUTACHTEN_AUFLAGEN_MAX_LENGTH));
  }

  return unique;
}

function sliceSectionBody(text: string, start: number, headingLength: number): string {
  const tail = text.slice(start + headingLength);
  const endAt = tail.search(SECTION_END);
  return (endAt >= 0 ? tail.slice(0, endAt) : tail.slice(0, 20_000)).trim();
}

function linesFromSection(sectionText: string): string[] {
  const lines: string[] = [];

  for (const rawLine of sectionText.split(/\n/)) {
    const trimmed = rawLine.trim();
    if (!trimmed || SKIP_LINE.test(trimmed)) continue;
    const cleaned = stripListMarker(trimmed);
    if (cleaned.length > 0) lines.push(cleaned);
  }

  return lines;
}

function extractFromRomanSections(text: string): string[] {
  const sections: string[] = [];

  for (const match of text.matchAll(TGA_AUFLAGEN_SECTION)) {
    const start = match.index ?? 0;
    const body = sliceSectionBody(text, start, match[0].length);
    if (body.length >= 8) sections.push(body);
  }

  return sections.flatMap((section) => linesFromSection(section));
}

function extractFromInlineAuflagen(text: string): string[] {
  const match = text.match(AUFLAGEN_INLINE);
  if (!match?.[2]) return [];

  const body = match[2].split(SECTION_END)[0]?.trim() ?? match[2].trim();
  if (!body) return [];

  if (isAuflageSectionHeading(body) || body.includes("\n")) {
    return linesFromSection(body);
  }

  return [body];
}

function extractFromColonHeadings(text: string): string[] {
  const lines = text.split(/\n/).map((line) => line.trim()).filter(Boolean);
  const startIdx = lines.findIndex((line) => isAuflageSectionHeading(stripListMarker(line)));
  if (startIdx < 0) return [];

  const tail = lines.slice(startIdx).join("\n");
  const bounded = tail.split(SECTION_END)[0] ?? tail;
  return linesFromSection(bounded);
}

/**
 * Heuristic §19.3 Teilegutachten Auflagen extraction from full OCR text.
 * Targets sections III/IV, colon headings, and inline Auflagen blocks.
 */
export function extractTeilegutachtenAuflagenFromText(
  rawText: string,
): string[] | null {
  const text = rawText.replace(/\r\n/g, "\n").trim();
  if (text.length < 8) return null;

  const rawLines = [
    ...extractFromRomanSections(text),
    ...extractFromInlineAuflagen(text),
    ...extractFromColonHeadings(text),
  ];

  if (rawLines.length === 0) return null;

  const grouped = dedupeAuflagen(groupTeilegutachtenAuflagen(rawLines));
  return grouped.length > 0 ? grouped.slice(0, 40) : null;
}

/** Merge LLM + heuristic Auflagen — keep every distinct section from both sources. */
export function mergeTeilegutachtenAuflagen(
  primary: string[] | null | undefined,
  fallback: string[] | null | undefined,
): string[] | null {
  if (!primary?.length && !fallback?.length) return null;

  const grouped = dedupeAuflagen(
    groupTeilegutachtenAuflagen([...(primary ?? []), ...(fallback ?? [])]),
  );

  return grouped.length > 0 ? grouped.slice(0, 40) : null;
}
