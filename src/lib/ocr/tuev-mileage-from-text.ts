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

/** Punkt 4 / Feld 4 labels on TÜV Rheinland, DEKRA, GTÜ forms. */
const PUNKT4_LABEL =
  /(?:\(?4\)?[\.)]?\s*)?(?:Stand\s+Wegstreckenzähler|Wegstreckenzähler|Km-?St\.?|KM-?Stand|Kilometerstand|km-stand|Tachostand)|(?:Punkt|Feld)\s*4|4\.\s*(?:Kilometerstand|km-stand|Km-?St\.?)/i;

const PUNKT4_CAPTURE =
  /(?:(?:\(?4\)?[\.)]?\s*)?(?:Stand\s+Wegstreckenzähler|Wegstreckenzähler|Km-?St\.?|KM-?Stand|Kilometerstand|km-stand|Tachostand)|(?:Punkt|Feld)\s*4|4\.\s*(?:Kilometerstand|km-stand|Km-?St\.?))\s*[:\s]*([\d][\d.\s]{2,12})\s*(?:km\b)?/gi;

/** Same line as label, or number on the next line (common in table OCR). */
export function extractTuevPunkt4MileageKmFromText(rawText: string): number | null {
  const text = normalizeTuevOcrText(rawText);
  return extractFromPunkt4Block(text);
}

/** Same line as label, or number on the next line (common in table OCR). */
function extractFromPunkt4Block(text: string): number | null {
  for (const match of text.matchAll(PUNKT4_CAPTURE)) {
    const value = parseKmDigits(match[1] ?? "");
    if (value !== null) return value;
  }

  const lines = text.split(/\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]!.trim();
    if (!PUNKT4_LABEL.test(line)) continue;

    const inline = line.match(/([\d][\d.\s]{2,12})\s*(?:km\b)?/i);
    if (inline) {
      const value = parseKmDigits(inline[1] ?? "");
      if (value !== null) return value;
    }

    for (let offset = 1; offset <= 2; offset += 1) {
      const next = lines[index + offset]?.trim();
      if (!next || PUNKT4_LABEL.test(next)) continue;
      if (/^\d[\d.\s]{2,12}(?:\s*km\b)?$/i.test(next)) {
        const value = parseKmDigits(next);
        if (value !== null) return value;
      }
    }
  }

  return null;
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
  if (punkt4 !== null) return punkt4;

  const fallback = extractTuevMileageKmFromText(rawText);
  return fallback ?? llmKm;
}
