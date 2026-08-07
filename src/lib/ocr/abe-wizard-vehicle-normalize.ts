import type { AbeVehicleMatch } from "@/lib/validations/abeWizardSchemas";

const DRIVE_TYPES = new Set([
  "allradantrieb",
  "heckantrieb",
  "frontantrieb",
]);

const FAHRZEUGTYP_PATTERN =
  /^(?:\d{1,2}[a-zA-Z]?-\w+|\d{1,2}[a-zA-Z]?|[a-zA-Z]-\w+|[a-zA-Z]\d{1,2})$/;

const STRICT_AUFlagen_CODE_PATTERN =
  /^(?:\d{2,3}|\d{1,2}[A-Z]{1,2}|[A-Z]\d{2,3})$/;

const LETTER_AUFlagen_CODE_PATTERN = /^[A-Z]{2,3}$/;

const VERKAUFSBEZEICHNUNG_HINT =
  /\b(REIHE|TOURING|COUP[EÉ]|CABRIO|LIMOUSINE|SPORTBACK|GRAN\s+TURISMO|MODELL|SERIE)\b/i;

export function looksLikeFahrzeugtypCode(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || trimmed.includes(" ")) return false;
  if (trimmed.length > 10) return false;
  if (VERKAUFSBEZEICHNUNG_HINT.test(trimmed)) return false;
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

export function looksLikeVerkaufsbezeichnung(value: string): boolean {
  const trimmed = stripVerkaufsbezeichnungLabel(value);
  if (!trimmed) return false;
  if (looksLikeFahrzeugtypCode(trimmed)) return false;
  if (looksLikeAuflagenCode(trimmed)) return false;
  if (DRIVE_TYPES.has(trimmed.toLowerCase())) return false;
  if (VERKAUFSBEZEICHNUNG_HINT.test(trimmed)) return true;
  if (trimmed.includes(" ") && trimmed.length >= 6) return true;
  if (trimmed.length >= 8 && /[A-Za-zÄÖÜäöü]{4,}/.test(trimmed)) return true;
  return false;
}

export function stripVerkaufsbezeichnungLabel(
  value: string | null | undefined,
): string {
  if (!value) return "";
  return value
    .replace(/^verkaufsbezeichnung\s*:\s*/i, "")
    .trim();
}

function tokenizeAuflagenColumn(items: readonly string[]): string[] {
  return items
    .flatMap((item) => item.trim().split(/\s+/))
    .map((token) => token.replace(/[,;]+$/g, "").trim())
    .filter(Boolean);
}

/** Keep only short Auflagen codes; drop drive-type words and stray text. */
export function parseAuflagenCodes(
  auflagenItems: readonly string[],
): { codes: string[]; driveType: string | null } {
  const tokens = tokenizeAuflagenColumn(auflagenItems);
  const codes: string[] = [];
  let driveType: string | null = null;

  for (const token of tokens) {
    const lower = token.toLowerCase();
    if (DRIVE_TYPES.has(lower)) {
      driveType ??= token;
      continue;
    }
    if (looksLikeAuflagenCode(token)) {
      codes.push(token);
    }
  }

  return { codes, driveType };
}

function resolveVerkaufsbezeichnung(
  raw: string,
  currentGroup: string | null,
): string | null {
  const stripped = stripVerkaufsbezeichnungLabel(raw);
  if (looksLikeVerkaufsbezeichnung(stripped)) return stripped;
  if (looksLikeFahrzeugtypCode(stripped)) return currentGroup;
  if (stripped.length >= 4 && !looksLikeAuflagenCode(stripped)) return stripped;
  return currentGroup;
}

/**
 * Normalize extracted rows: carry Verkaufsbezeichnung headers across groups,
 * clean Auflagen codes, preserve Fahrzeugtyp separately.
 */
export function normalizeAbeVehicleMatches(
  matches: AbeVehicleMatch[],
): AbeVehicleMatch[] {
  let currentVerkaufsbezeichnung: string | null = null;

  return matches.map((match) => {
    const parsedAuflagen = parseAuflagenCodes(match.auflagenCodes);
    const resolvedGroup = resolveVerkaufsbezeichnung(
      match.verkaufsbezeichnung,
      currentVerkaufsbezeichnung,
    );

    if (resolvedGroup) {
      currentVerkaufsbezeichnung = resolvedGroup;
    }

    const fahrzeugtyp =
      match.fahrzeugtyp?.trim() ||
      (looksLikeFahrzeugtypCode(match.verkaufsbezeichnung)
        ? match.verkaufsbezeichnung.trim()
        : null);

    return {
      ...match,
      verkaufsbezeichnung:
        resolvedGroup ??
        currentVerkaufsbezeichnung ??
        stripVerkaufsbezeichnungLabel(match.verkaufsbezeichnung),
      fahrzeugtyp,
      driveType: match.driveType ?? parsedAuflagen.driveType,
      auflagenCodes: parsedAuflagen.codes,
    };
  });
}
