import {
  defectsListFromTuevDefectRows,
  extractTuevDefectsFromText,
} from "@/lib/ocr/tuev-defects-from-text";
import { preferTuevTotalAmount } from "@/lib/ocr/tuev-amount-from-text";
import { preferTuevMileageKm } from "@/lib/ocr/tuev-mileage-from-text";
import { extractTuevTestDateFromText } from "@/lib/ocr/tuev-test-date-from-text";
import {
  normalizeTuevLineItems,
  parseTuevAmountValue,
} from "@/lib/ocr/tuev-amount";
import type { TuevDefectRow } from "@/lib/validations/documentSchemas";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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

function mergeDefectRows(
  primary: TuevDefectRow[] | null | undefined,
  secondary: TuevDefectRow[] | null | undefined,
): TuevDefectRow[] | null {
  const merged = dedupeDefectRows([...(primary ?? []), ...(secondary ?? [])]);
  return merged.length > 0 ? merged : null;
}

/**
 * Enrich raw LLM TÜV JSON with OCR text heuristics for Kopf KM, Endpreis, Punkt 6.
 */
export function enrichTuevRecordFromOcrText(
  record: Record<string, unknown>,
  ocrText: string | null | undefined,
): Record<string, unknown> {
  if (!ocrText?.trim()) return record;

  const mileageKm = preferTuevMileageKm(
    typeof record.mileageKm === "number" ? record.mileageKm : null,
    ocrText,
  );

  const testDate =
    (typeof record.testDate === "string" && record.testDate.trim()
      ? record.testDate
      : null) ?? extractTuevTestDateFromText(ocrText);

  const lineItems = normalizeTuevLineItems(record.lineItems);
  const amount = preferTuevTotalAmount(
    parseTuevAmountValue(record.amount),
    lineItems,
    ocrText,
  );

  const llmTable = Array.isArray(record.defectsTable)
    ? (record.defectsTable as TuevDefectRow[])
    : null;
  const ocrTable = extractTuevDefectsFromText(ocrText);
  const defectsTable = mergeDefectRows(llmTable, ocrTable);

  const defectsList =
    defectsTable && defectsTable.length > 0
      ? defectsListFromTuevDefectRows(defectsTable)
      : Array.isArray(record.defectsList) && record.defectsList.length > 0
        ? record.defectsList
        : null;

  return {
    ...record,
    testDate,
    mileageKm,
    amount,
    lineItems,
    defectsTable,
    defectsList,
  };
}

export function enrichTuevSanitizedFromOcrText(
  sanitized: unknown,
  ocrText: string | null | undefined,
): unknown {
  if (!ocrText?.trim() || !isRecord(sanitized)) return sanitized;

  const mileageKm = preferTuevMileageKm(
    typeof sanitized.mileageKm === "number" ? sanitized.mileageKm : null,
    ocrText,
  );

  const testDate =
    (typeof sanitized.testDate === "string" && sanitized.testDate.trim()
      ? sanitized.testDate
      : null) ?? extractTuevTestDateFromText(ocrText);

  return {
    ...sanitized,
    testDate,
    mileageKm,
  };
}
