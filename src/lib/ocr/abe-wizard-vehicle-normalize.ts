import type { AbeVehicleMatch } from "@/lib/validations/abeWizardSchemas";

const DRIVE_TYPES = new Set([
  "allradantrieb",
  "heckantrieb",
  "frontantrieb",
]);

/** Short Betriebserlaubnis / type codes in the Fahrzeugtyp column — not selectable models. */
const FAHRZEUGTYP_PATTERN =
  /^(?:\d{1,2}[a-zA-Z]?-\w+|\d{1,2}[a-zA-Z]?|[a-zA-Z]-\w+|[a-zA-Z]\d{1,2})$/;

/** Auflagen condition codes such as 744, A77, 20B (uppercase / digits, no lowercase). */
const STRICT_AUFlagen_CODE_PATTERN =
  /^(?:\d{2,3}|\d{1,2}[A-Z]{1,2}|[A-Z]\d{2,3})$/;

const LETTER_AUFlagen_CODE_PATTERN = /^[A-Z]{2,3}$/;

export function looksLikeFahrzeugtypCode(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || trimmed.includes(" ")) return false;
  if (trimmed.length > 10) return false;
  return FAHRZEUGTYP_PATTERN.test(trimmed);
}

export function looksLikeStrictAuflagenCode(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || /[a-zäöü]/.test(trimmed)) return false;
  if (DRIVE_TYPES.has(trimmed.toLowerCase())) return false;
  if (trimmed.length > 5) return false;
  return STRICT_AUFlagen_CODE_PATTERN.test(trimmed);
}

export function looksLikeLetterAuflagenCode(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || /[a-zäöü]/.test(trimmed)) return false;
  if (DRIVE_TYPES.has(trimmed.toLowerCase())) return false;
  return LETTER_AUFlagen_CODE_PATTERN.test(trimmed);
}

export function looksLikeAuflagenCode(value: string): boolean {
  return (
    looksLikeStrictAuflagenCode(value) ||
    looksLikeLetterAuflagenCode(value)
  );
}

function tokenizeAuflagenColumn(items: readonly string[]): string[] {
  return items
    .flatMap((item) => item.trim().split(/\s+/))
    .map((token) => token.replace(/[,;]+$/g, "").trim())
    .filter(Boolean);
}

/**
 * Split one Auflagen cell into the exact model (leading text) and condition codes.
 * The model always starts the cell; codes such as 744 / A77 / 20B follow.
 */
export function parseAuflagenColumn(
  auflagenItems: readonly string[],
  existingDriveType: string | null = null,
): { model: string | null; codes: string[]; driveType: string | null } {
  const tokens = tokenizeAuflagenColumn(auflagenItems);
  const modelParts: string[] = [];
  const codes: string[] = [];
  let driveType = existingDriveType;
  let codeSectionStarted = false;

  let firstStrictCodeIndex = -1;
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]!;
    if (DRIVE_TYPES.has(token.toLowerCase())) continue;
    if (looksLikeStrictAuflagenCode(token)) {
      firstStrictCodeIndex = index;
      break;
    }
  }

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]!;
    const lower = token.toLowerCase();

    if (DRIVE_TYPES.has(lower)) {
      driveType ??= token;
      continue;
    }

    if (firstStrictCodeIndex >= 0) {
      if (index < firstStrictCodeIndex) {
        modelParts.push(token);
        continue;
      }

      codeSectionStarted = true;
      if (looksLikeAuflagenCode(token)) {
        codes.push(token);
      }
      continue;
    }

    if (!codeSectionStarted && looksLikeLetterAuflagenCode(token)) {
      codeSectionStarted = true;
      codes.push(token);
      continue;
    }

    if (codeSectionStarted) {
      if (looksLikeAuflagenCode(token)) codes.push(token);
      continue;
    }

    modelParts.push(token);
  }

  return {
    model: modelParts.join(" ").trim() || null,
    codes,
    driveType,
  };
}

function isUsableExtractedModel(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (looksLikeFahrzeugtypCode(trimmed)) return false;
  if (looksLikeAuflagenCode(trimmed)) return false;
  return true;
}

/**
 * Normalize vehicle rows: selectable model from the start of Auflagen,
 * condition codes separated (744, A77, 20B, …).
 */
export function normalizeAbeVehicleMatches(
  matches: AbeVehicleMatch[],
): AbeVehicleMatch[] {
  return matches.map((match) => {
    const parsed = parseAuflagenColumn(
      match.auflagenCodes,
      match.driveType,
    );

    const modelFromAuflagen = parsed.model;
    const fallbackModel = isUsableExtractedModel(match.model)
      ? match.model.trim()
      : null;

    return {
      ...match,
      model: modelFromAuflagen ?? fallbackModel ?? match.model.trim(),
      driveType: parsed.driveType,
      auflagenCodes: parsed.codes,
    };
  });
}
