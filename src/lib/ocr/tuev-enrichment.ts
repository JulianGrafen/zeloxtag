import {
  defectsListFromTuevDefectRows,
  extractTuevDefectsFromText,
  normalizeCheckpoint,
} from "@/lib/ocr/tuev-defects-from-text";
import { preferTuevTotalAmount } from "@/lib/ocr/tuev-amount-from-text";
import { preferTuevMileageKm } from "@/lib/ocr/tuev-mileage-from-text";
import { preferTuevNextInspectionDate } from "@/lib/ocr/tuev-next-inspection-from-text";
import { normalizeTuevOcrText } from "@/lib/ocr/tuev-ocr-normalize";
import { preferTuevTestDate } from "@/lib/ocr/tuev-test-date-from-text";
import {
  normalizeTuevLineItems,
  parseTuevAmountValue,
} from "@/lib/ocr/tuev-amount";
import type { TuevDefectRow, TuevResult } from "@/lib/validations/documentSchemas";
import { inferResultFromDefectRows } from "@/services/documents/TuevReportService";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function foldText(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

function normalizeOcrText(ocrText: string | null | undefined): string | null {
  const trimmed = ocrText?.trim();
  if (!trimmed) return null;
  return normalizeTuevOcrText(trimmed);
}

function dedupeDefectRows(rows: TuevDefectRow[]): TuevDefectRow[] {
  const seen = new Set<string>();
  const unique: TuevDefectRow[] = [];

  for (const row of rows) {
    const key = [
      row.checkpoint ?? "",
      row.description.toLowerCase(),
      row.severity ?? "",
    ].join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(row);
    if (unique.length >= 80) break;
  }

  return unique;
}

function sameDefectRow(a: TuevDefectRow, b: TuevDefectRow): boolean {
  const cpA = (a.checkpoint ?? "").toLowerCase();
  const cpB = (b.checkpoint ?? "").toLowerCase();
  if (cpA && cpB && cpA === cpB) return true;
  return foldText(a.description) === foldText(b.description);
}

function rowMatchesOcr(row: TuevDefectRow, ocrText: string): boolean {
  const folded = foldText(ocrText);

  if (row.checkpoint) {
    const checkpoint = normalizeCheckpoint(row.checkpoint).toLowerCase();
    if (checkpoint && folded.includes(checkpoint)) return true;
  }

  const description = foldText(row.description).replace(/\s+/g, " ");
  if (description.length >= 12) {
    const snippet = description.slice(0, Math.min(48, description.length));
    if (folded.includes(snippet)) return true;
  }

  const words = description.split(/\s+/).filter((word) => word.length >= 4);
  if (words.length === 0) return false;

  const matches = words.filter((word) => folded.includes(word)).length;
  return matches >= Math.min(2, words.length);
}

/**
 * Reconcile LLM defects with OCR Punkt 6 — prevents invented Mängel.
 * LLM checkpoints are kept verbatim when verified in OCR text; OCR rows
 * only fill gaps the LLM missed (never overwrite LLM Prüfpunkte).
 */
export function reconcileTuevDefectRows(
  llmTable: TuevDefectRow[] | null | undefined,
  ocrText: string | null | undefined,
): TuevDefectRow[] | null {
  const normalized = normalizeOcrText(ocrText);
  const llmRows = dedupeDefectRows(llmTable ?? []);

  if (!normalized) {
    return llmRows.length > 0 ? llmRows : null;
  }

  const ocrTable = extractTuevDefectsFromText(normalized);

  if (llmRows.length > 0) {
    const verifiedLlm = llmRows.filter((row) => rowMatchesOcr(row, normalized));

    const merged = dedupeDefectRows([...verifiedLlm]);

    if (ocrTable?.length) {
      const extras = ocrTable.filter(
        (ocrRow) =>
          rowMatchesOcr(ocrRow, normalized) &&
          !merged.some((existing) => sameDefectRow(existing, ocrRow)),
      );
      merged.push(...extras);
    }

    const deduped = dedupeDefectRows(merged);
    if (deduped.length > 0) return deduped;
    return null;
  }

  if (ocrTable?.length) {
    return dedupeDefectRows(ocrTable);
  }

  return null;
}

function normalizeTuevResult(value: unknown): TuevResult {
  const allowed: TuevResult[] = [
    "no_defects",
    "minor_defects",
    "major_defects",
    "dangerous_defects",
    "failed",
  ];
  return typeof value === "string" && allowed.includes(value as TuevResult)
    ? (value as TuevResult)
    : "no_defects";
}

/**
 * Enrich raw LLM TÜV JSON with OCR text heuristics for Kopf KM, Endpreis, Punkt 6.
 */
export function enrichTuevRecordFromOcrText(
  record: Record<string, unknown>,
  ocrText: string | null | undefined,
): Record<string, unknown> {
  const normalized = normalizeOcrText(ocrText);
  if (!normalized) return record;

  const mileageKm = preferTuevMileageKm(
    typeof record.mileageKm === "number" ? record.mileageKm : null,
    normalized,
  );

  const testDate = preferTuevTestDate(
    typeof record.testDate === "string" ? record.testDate : null,
    normalized,
  );

  const nextInspectionDate = preferTuevNextInspectionDate(
    typeof record.nextInspectionDate === "string"
      ? record.nextInspectionDate
      : null,
    normalized,
  );

  const lineItems = normalizeTuevLineItems(record.lineItems);
  const amount = preferTuevTotalAmount(
    parseTuevAmountValue(record.amount),
    lineItems,
    normalized,
  );

  const llmTable = Array.isArray(record.defectsTable)
    ? (record.defectsTable as TuevDefectRow[])
    : null;
  const defectsTable = reconcileTuevDefectRows(llmTable, normalized);

  const defectsList =
    defectsTable && defectsTable.length > 0
      ? defectsListFromTuevDefectRows(defectsTable)
      : null;

  let result = normalizeTuevResult(record.result);
  if (defectsTable?.length) {
    result = inferResultFromDefectRows(defectsTable, result);
  } else if (result !== "no_defects" && result !== "failed") {
    const folded = foldText(normalized);
    if (
      /\bohne\s+(?:erhebliche\s+)?m[aä]ngel\b|\bmangelfrei\b/i.test(folded) &&
      !/\([EG]M\)/i.test(normalized)
    ) {
      result = "no_defects";
    }
  }

  return {
    ...record,
    testDate,
    nextInspectionDate,
    mileageKm,
    amount,
    lineItems,
    defectsTable,
    defectsList,
    result,
  };
}

export function enrichTuevSanitizedFromOcrText(
  sanitized: unknown,
  ocrText: string | null | undefined,
): unknown {
  const normalized = normalizeOcrText(ocrText);
  if (!normalized || !isRecord(sanitized)) return sanitized;

  const mileageKm = preferTuevMileageKm(
    typeof sanitized.mileageKm === "number" ? sanitized.mileageKm : null,
    normalized,
  );

  const testDate = preferTuevTestDate(
    typeof sanitized.testDate === "string" ? sanitized.testDate : null,
    normalized,
  );

  const nextInspectionDate = preferTuevNextInspectionDate(
    typeof sanitized.nextInspectionDate === "string"
      ? sanitized.nextInspectionDate
      : null,
    normalized,
  );

  const currentResult = normalizeTuevResult(sanitized.result);
  const defectsTable = Array.isArray(sanitized.defectsTable)
    ? (sanitized.defectsTable as TuevDefectRow[])
    : null;
  const result =
    defectsTable?.length
      ? inferResultFromDefectRows(defectsTable, currentResult)
      : currentResult;

  return {
    ...sanitized,
    testDate,
    nextInspectionDate,
    mileageKm,
    result,
  };
}
