import type { Document } from "@/types/database";

const SERVICE_TITLE_HINT =
  /\binspektion\b|\bwartung\b|\bölwechsel\b|\boelwechsel\b|\bservice\b|\bintervall\b/i;

/**
 * Documents that belong under Service & Wartung (Inspektionen).
 * Prefer persisted OCR category; fall back to title heuristics for legacy rows.
 */
export function isServiceInspectionDocument(document: Document): boolean {
  if (document.category === "service") return true;
  if (document.type !== "invoice") return false;
  if (document.category && document.category !== "service") return false;
  return SERVICE_TITLE_HINT.test(document.title);
}

export function filterServiceInspectionDocuments(
  documents: Document[],
): Document[] {
  return documents
    .filter(isServiceInspectionDocument)
    .sort((a, b) => {
      const aDate = a.date ?? a.created_at;
      const bDate = b.date ?? b.created_at;
      return bDate.localeCompare(aDate);
    });
}
