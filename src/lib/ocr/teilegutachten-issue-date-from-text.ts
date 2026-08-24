import { extractAbeDateFromText } from "@/lib/ocr/abe-from-text";
import { normalizeAbeDate } from "@/lib/ocr/abe-parse-schema";
import type { TeilegutachtenExtraction } from "@/lib/validations/teilegutachtenSchema";

/** Prefer LLM date; fall back to OCR heuristic from cover/header block. */
export function mergeTeilegutachtenIssueDate(
  primary: string | null | undefined,
  fallback: string | null | undefined,
): string | null {
  return normalizeAbeDate(primary) ?? normalizeAbeDate(fallback);
}

/** Fill missing Gutachten-/Ausstellungsdatum from OCR text. */
export function enrichTeilegutachtenIssueDateFromOcr(
  extracted: TeilegutachtenExtraction,
  ocrText: string,
): TeilegutachtenExtraction {
  const fromOcr = extractAbeDateFromText(ocrText);
  const merged = mergeTeilegutachtenIssueDate(extracted.issueDate, fromOcr);

  if (!merged || merged === extracted.issueDate) {
    return extracted;
  }

  return { ...extracted, issueDate: merged };
}
