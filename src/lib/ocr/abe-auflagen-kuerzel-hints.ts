/** Shared LLM guidance for Verwendungsbereich Auflagen columns. */
export const ABE_AUFLAGEN_COLUMN_LLM_HINT =
  "List EVERY short Auflagen-Kürzel from ALL Auflagen cells on this same table row (reifenbezogene Auflagen AND Auflagen und Hinweise). Never stop after the first two. Letter suffixes are letters, not digits: 22B not 228, 11A not 114, 22I not 221, 10B not 108.";

/** Left Auflagen column — next to Reifen. */
export const ABE_REIFENBEZOGENE_AUFLAGEN_LLM_HINT =
  "Reifenbezogene Auflagen column (left Auflagen column, adjacent to Reifen): every short Kürzel from this cell on this row only. Letter suffixes stay letters (22B not 228). Empty array when column missing or empty.";

/** Rightmost Auflagen column — often missed if crop is too narrow. */
export const ABE_AUFLAGEN_UND_HINWEISE_LLM_HINT =
  "RIGHTMOST column 'Auflagen und Hinweise': every short Kürzel from this cell on this row — always read this column even when reifenbezogene Auflagen were already captured. Examples: 744, A01, A02, A04, 11A, F40, L04, B04A. Empty array when column missing or empty.";

/** OpenAI JSON schema properties for split Auflagen columns on vehicle rows. */
export function abeVehicleRowAuflagenJsonProperties(fromPrefix: string) {
  return {
    reifenbezogeneAuflagenCodes: {
      type: "array" as const,
      items: { type: "string" as const },
      description: fromPrefix + ABE_REIFENBEZOGENE_AUFLAGEN_LLM_HINT,
    },
    auflagenUndHinweiseCodes: {
      type: "array" as const,
      items: { type: "string" as const },
      description: fromPrefix + ABE_AUFLAGEN_UND_HINWEISE_LLM_HINT,
    },
  };
}

export const ABE_VEHICLE_ROW_AUFLAGEN_JSON_REQUIRED = [
  "reifenbezogeneAuflagenCodes",
  "auflagenUndHinweiseCodes",
] as const;
