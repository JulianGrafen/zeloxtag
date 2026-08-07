/**
 * Hybrid TÜV merge: OCR/text heuristics for KM-Stand + Punkt-6 Mängel,
 * vision LLM for metadata/costs. Anti-hallucination guard on defects.
 */

import { preferTuevHeaderMileageKm } from "@/lib/ocr/mileage-from-text";
import {
  defectsListFromTuevDefectRows,
  extractTuevDefectsFromText,
  hasTuevPunkt6Section,
} from "@/lib/ocr/tuev-defects-from-text";
import type { TuevDefectRow, TuevReport } from "@/lib/validations/documentSchemas";

export type TuevDefectsMergeResult = {
  defectsTable: TuevDefectRow[] | null;
  defectsList: string[] | null;
};

function llmDefectsFromReport(report: Pick<TuevReport, "defectsTable" | "defectsList">): TuevDefectsMergeResult {
  if (report.defectsTable?.length) {
    return {
      defectsTable: report.defectsTable,
      defectsList:
        report.defectsList ??
        defectsListFromTuevDefectRows(report.defectsTable),
    };
  }

  if (report.defectsList?.length) {
    return {
      defectsTable: report.defectsList.map((description) => ({
        checkpoint: null,
        description,
        severity: null,
      })),
      defectsList: report.defectsList,
    };
  }

  return { defectsTable: null, defectsList: null };
}

/**
 * Merge LLM defects with Punkt-6 OCR heuristics.
 * When Punkt 6 is present but empty, discard LLM hallucinations.
 */
export function mergeTuevDefectsHybrid(
  llmReport: Pick<TuevReport, "defectsTable" | "defectsList">,
  ocrText: string,
): TuevDefectsMergeResult {
  const text = ocrText.trim();
  if (text.length < 8) {
    return llmDefectsFromReport(llmReport);
  }

  const heuristicTable = extractTuevDefectsFromText(text);
  if (heuristicTable?.length) {
    return {
      defectsTable: heuristicTable,
      defectsList: defectsListFromTuevDefectRows(heuristicTable),
    };
  }

  if (hasTuevPunkt6Section(text)) {
    // Punkt 6 found but no parseable rows → mangelfrei; reject LLM defects.
    return { defectsTable: null, defectsList: null };
  }

  return llmDefectsFromReport(llmReport);
}

/** Apply hybrid KM + Mängel merge onto a vision-LLM TÜV report. */
export function mergeTuevHybridReport(
  llmReport: TuevReport,
  ocrText: string,
): TuevReport {
  const text = ocrText.trim();
  const defects =
    text.length >= 8
      ? mergeTuevDefectsHybrid(llmReport, text)
      : llmDefectsFromReport(llmReport);

  return {
    ...llmReport,
    mileageKm:
      text.length >= 8
        ? preferTuevHeaderMileageKm(llmReport.mileageKm, text)
        : llmReport.mileageKm,
    defectsTable: defects.defectsTable,
    defectsList: defects.defectsList,
  };
}
