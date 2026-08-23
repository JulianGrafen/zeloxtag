/**
 * Kilometerstand extraction for German HU/AU reports — Punkt 4 / Feld 4 first.
 */

import { extractMileageKmFromText } from "@/lib/ocr/mileage-from-text";
import { normalizeTuevOcrText } from "@/lib/ocr/tuev-ocr-normalize";

const MAX_KM = 9_999_999;
const MIN_KM = 100;

function parseKmDigits(raw: string): number | null {
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits || digits.length < 3 || digits.length > 7) return null;
  const value = Number.parseInt(digits, 10);
  if (!Number.isFinite(value) || value < MIN_KM || value > MAX_KM) return null;
  return value;
}

/** km-specific labels under Punkt 4 on TÜV / DEKRA / GTÜ forms. */
const PUNKT4_KM_LABEL =
  /(?:Stand\s+)?Wegstreckenz[aä]hler|Wegstrecken\s*z[aä]hler|Km-?St\.?|KM-?Stand|Kilometerstand|km-?stand|Tachostand|Laufleistung/i;

/** Full Punkt-4 field label including section marker. */
const PUNKT4_FULL_LABEL =
  /(?:\(?4\)?[\.)]?\s*)?(?:Stand\s+)?Wegstreckenz[aä]hler|(?:\(?4\)?[\.)]?\s*)?(?:Km-?St\.?|KM-?Stand|Kilometerstand|km-?stand|Tachostand)|(?:Punkt|Feld)\s*4\b|4\.\s*(?:Kilometerstand|km-?stand|Km-?St\.?|Stand\s+Wegstreckenz[aä]hler)/i;

/** Line starts with Punkt-4 marker — value may be on following lines. */
const PUNKT4_MARKER_LINE =
  /^\(?4\)?[\.)]?\s*(?:$|[^\d])|^(?:Punkt|Feld)\s*4\b|^\(?4\)?[\.)]?\s*(?:Stand\s+)?Wegstreckenz[aä]hler|^\(?4\)?[\.)]?\s*Km-?St/i;

const PUNKT4_CAPTURE =
  /(?:(?:\(?4\)?[\.)]?\s*)?(?:Stand\s+)?Wegstreckenz[aä]hler|Wegstrecken\s*z[aä]hler|(?:\(?4\)?[\.)]?\s*)?(?:Km-?St\.?|KM-?Stand|Kilometerstand|km-?stand|Tachostand)|(?:Punkt|Feld)\s*4\b|4\.\s*(?:Kilometerstand|km-?stand|Km-?St\.?))\s*[:\s]*([\d][\d.\s]{2,12})\s*(?:km\b)?/gi;

const NEXT_SECTION_LINE = /^\(?[56789]\)?[\.)]?\s/i;

function stripTableNoise(line: string): string {
  return line
    .replace(/^\|+\s*|\s*\|+$/g, "")
    .replace(/\|/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function looksLikeOdometerOnlyLine(line: string): boolean {
  const cleaned = stripTableNoise(line);
  return /^[\d][\d.\s]{2,12}(?:\s*km\b)?\.?$/i.test(cleaned);
}

function extractKmFromLine(line: string): number | null {
  const cleaned = stripTableNoise(line);
  if (!cleaned) return null;

  const labeled = cleaned.match(
    /(?:^|[:\s])([\d][\d.\s]{2,12})\s*(?:km\b)?\.?$/i,
  );
  if (labeled) {
    const value = parseKmDigits(labeled[1] ?? "");
    if (value !== null) return value;
  }

  if (looksLikeOdometerOnlyLine(cleaned)) {
    return parseKmDigits(cleaned);
  }

  const inline = cleaned.match(/([\d][\d.\s]{2,12})\s*(?:km\b)?/i);
  if (!inline) return null;
  return parseKmDigits(inline[1] ?? "");
}

function extractFromPunkt4Window(text: string, startIndex: number): number | null {
  const window = text.slice(startIndex, startIndex + 220);
  const localCapture = new RegExp(PUNKT4_CAPTURE.source, "gi");
  for (const match of window.matchAll(localCapture)) {
    const value = parseKmDigits(match[1] ?? "");
    if (value !== null) return value;
  }

  const lines = window.split(/\n/).slice(0, 6);
  return extractFromPunkt4Lines(lines);
}

function extractFromPunkt4Lines(lines: string[]): number | null {
  for (let index = 0; index < lines.length; index += 1) {
    const line = stripTableNoise(lines[index]!.trim());
    if (!line) continue;

    const isPunkt4Line =
      PUNKT4_FULL_LABEL.test(line) ||
      PUNKT4_MARKER_LINE.test(line) ||
      /^(?:Punkt|Feld)\s*4\b/i.test(line);

    if (!isPunkt4Line) continue;

    const inline = extractKmFromLine(line);
    if (inline !== null) return inline;

    let sawKmLabel = PUNKT4_KM_LABEL.test(line);

    for (let offset = 1; offset <= 4; offset += 1) {
      const next = stripTableNoise(lines[index + offset]?.trim() ?? "");
      if (!next) continue;
      if (NEXT_SECTION_LINE.test(next)) break;

      if (PUNKT4_KM_LABEL.test(next)) {
        sawKmLabel = true;
        const onLabelLine = extractKmFromLine(next);
        if (onLabelLine !== null) return onLabelLine;
        continue;
      }

      if (looksLikeOdometerOnlyLine(next)) {
        const value = extractKmFromLine(next);
        if (value !== null && (sawKmLabel || offset <= 2)) return value;
      }

      if (PUNKT4_FULL_LABEL.test(next)) {
        const nested = extractKmFromLine(next);
        if (nested !== null) return nested;
      }
    }
  }

  return null;
}

function extractFromPunkt4Block(text: string): number | null {
  for (const match of text.matchAll(PUNKT4_CAPTURE)) {
    const value = parseKmDigits(match[1] ?? "");
    if (value !== null) return value;
  }

  const lines = text.split(/\n/);
  const fromLines = extractFromPunkt4Lines(lines);
  if (fromLines !== null) return fromLines;

  const markerPattern = /\(?4\)?[\.)]?\s*(?:Stand\s+Wegstreckenz[aä]hler|Km-?St|KM-?Stand)?/gi;
  for (const match of text.matchAll(markerPattern)) {
    if (match.index == null) continue;
    const value = extractFromPunkt4Window(text, match.index);
    if (value !== null) return value;
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = stripTableNoise(lines[index]!.trim());
    if (!/^\(?4\)?[\.)]?\s*$/i.test(line)) continue;
    const value = extractFromPunkt4Lines(lines.slice(index, index + 6));
    if (value !== null) return value;
  }

  return null;
}

/** Same line as label, or number on the next lines (common in table OCR). */
export function extractTuevPunkt4MileageKmFromText(rawText: string): number | null {
  const text = normalizeTuevOcrText(rawText);
  return extractFromPunkt4Block(text);
}

/**
 * Extract odometer from HU/AU report OCR — prefers Punkt 4, falls back to generic labels.
 */
export function extractTuevMileageKmFromText(rawText: string): number | null {
  const text = normalizeTuevOcrText(rawText);
  const punkt4 = extractFromPunkt4Block(text);
  if (punkt4 !== null) return punkt4;
  return extractMileageKmFromText(text);
}

function isTruncatedLlmMileage(llmKm: number, ocrKm: number): boolean {
  const llmStr = String(llmKm);
  const ocrStr = String(ocrKm);
  if (ocrStr.startsWith(llmStr) && ocrStr.length > llmStr.length) return true;
  if (ocrKm > llmKm && ocrKm < llmKm * 100) return true;
  return false;
}

/** Prefer Punkt-4 OCR mileage; LLM often drops digits on long odometer readings. */
export function preferTuevMileageKm(
  structured: number | null | undefined,
  rawText: string,
): number | null {
  const llmKm =
    typeof structured === "number" &&
    Number.isFinite(structured) &&
    structured >= MIN_KM &&
    structured <= MAX_KM
      ? Math.round(structured)
      : null;

  if (!rawText.trim()) return llmKm;

  const punkt4 = extractTuevPunkt4MileageKmFromText(rawText);
  if (punkt4 !== null) {
    if (llmKm !== null && llmKm !== punkt4 && isTruncatedLlmMileage(llmKm, punkt4)) {
      return punkt4;
    }
    return punkt4;
  }

  // Punkt 4 only — generic invoice-style KM heuristics pick up unrelated numbers
  // (other form fields, fees, VIN fragments) and must not override TÜV mileage.
  return llmKm;
}
