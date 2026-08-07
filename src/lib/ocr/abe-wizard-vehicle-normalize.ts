import type { AbeVehicleMatch } from "@/lib/validations/abeWizardSchemas";

const DRIVE_TYPES = new Set([
  "allradantrieb",
  "heckantrieb",
  "frontantrieb",
]);

/** Short Betriebserlaubnis / type codes in the Fahrzeugtyp column — not sales names. */
const FAHRZEUGTYP_PATTERN =
  /^(?:\d{1,2}[a-zA-Z]?-\w+|\d{1,2}[a-zA-Z]?|[a-zA-Z]-\w+|[a-zA-Z]\d{1,2})$/;

/** Typical Auflagen short codes (10B, 721, BEN, 4DA). */
const AUFLAgen_CODE_PATTERN =
  /^(?:[0-9]{1,3}[A-ZÄÖÜ]{0,2}|[A-ZÄÖÜ]{2,4}|[0-9]{2,3})$/i;

const VERKAUFSBEZEICHNUNG_HINT =
  /\b(REIHE|TOURING|COUP[EÉ]|CABRIO|LIMOUSINE|SPORTBACK|GRAN\s+TURISMO|MODELL|SERIE)\b/i;

export function looksLikeFahrzeugtypCode(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed.includes(" ")) return false;
  if (trimmed.length > 10) return false;
  if (VERKAUFSBEZEICHNUNG_HINT.test(trimmed)) return false;
  return FAHRZEUGTYP_PATTERN.test(trimmed);
}

export function looksLikeAuflagenCode(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (DRIVE_TYPES.has(trimmed.toLowerCase())) return false;
  return AUFLAgen_CODE_PATTERN.test(trimmed);
}

export function looksLikeVerkaufsbezeichnung(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (looksLikeFahrzeugtypCode(trimmed)) return false;
  if (looksLikeAuflagenCode(trimmed)) return false;
  if (DRIVE_TYPES.has(trimmed.toLowerCase())) return false;

  if (VERKAUFSBEZEICHNUNG_HINT.test(trimmed)) return true;
  if (trimmed.includes(" ") && trimmed.length >= 6) return true;
  if (trimmed.length >= 10 && /[A-Za-zÄÖÜäöü]{4,}/.test(trimmed)) return true;

  return false;
}

function stripVerkaufsbezeichnungLabel(value: string): string {
  return value
    .replace(/^verkaufsbezeichnung\s*:\s*/i, "")
    .replace(/^nur\s+/i, "")
    .trim();
}

function pickVerkaufsbezeichnungFromAuflagen(
  auflagenCodes: readonly string[],
): string | null {
  for (const raw of auflagenCodes) {
    const candidate = stripVerkaufsbezeichnungLabel(raw);
    if (looksLikeVerkaufsbezeichnung(candidate)) {
      return candidate;
    }
  }
  return null;
}

function splitAuflagenCodes(auflagenCodes: readonly string[]): {
  codes: string[];
  vehicleName: string | null;
} {
  const codes: string[] = [];
  let vehicleName: string | null = null;

  for (const raw of auflagenCodes) {
    const trimmed = raw.trim();
    if (!trimmed) continue;

    const lower = trimmed.toLowerCase();
    if (DRIVE_TYPES.has(lower)) continue;

    const candidate = stripVerkaufsbezeichnungLabel(trimmed);
    if (looksLikeVerkaufsbezeichnung(candidate)) {
      vehicleName ??= candidate;
      continue;
    }

    if (looksLikeAuflagenCode(trimmed) || looksLikeFahrzeugtypCode(trimmed)) {
      codes.push(trimmed);
      continue;
    }

    if (candidate.length >= 6) {
      vehicleName ??= candidate;
      continue;
    }

    codes.push(trimmed);
  }

  return { codes, vehicleName };
}

/**
 * Fix LLM rows that used Fahrzeugtyp codes (e.g. 3k-N1) instead of
 * Verkaufsbezeichnung headers / Auflagen vehicle names.
 */
export function normalizeAbeVehicleMatches(
  matches: AbeVehicleMatch[],
): AbeVehicleMatch[] {
  let currentGroupLabel: string | null = null;

  return matches.map((match) => {
    const rawModel = match.model.trim();
    const { codes: cleanedAuflagen, vehicleName: nameFromAuflagen } =
      splitAuflagenCodes(match.auflagenCodes);

    let model = stripVerkaufsbezeichnungLabel(rawModel);

    if (looksLikeVerkaufsbezeichnung(model)) {
      currentGroupLabel = model;
    } else if (looksLikeFahrzeugtypCode(model) || looksLikeFahrzeugtypCode(rawModel)) {
      model =
        nameFromAuflagen ??
        pickVerkaufsbezeichnungFromAuflagen(match.auflagenCodes) ??
        currentGroupLabel ??
        rawModel;
    } else if (nameFromAuflagen) {
      model = nameFromAuflagen;
      currentGroupLabel = nameFromAuflagen;
    } else if (currentGroupLabel) {
      model = currentGroupLabel;
    }

    return {
      ...match,
      model,
      auflagenCodes: cleanedAuflagen,
    };
  });
}
