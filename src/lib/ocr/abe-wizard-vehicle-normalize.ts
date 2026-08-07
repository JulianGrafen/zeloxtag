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

const GROUP_FIELD_KEYS = [
  "verkaufsbezeichnung",
  "model",
  "sectionHeader",
  "group",
] as const;

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
  if (
    /^[A-Z0-9ÄÖÜ][A-Z0-9ÄÖÜ\s,.-]{4,}$/.test(trimmed) &&
    !looksLikeFahrzeugtypCode(trimmed)
  ) {
    return true;
  }
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

function readString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function readRowRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function readGroupLabel(row: Record<string, unknown>): string | null {
  for (const key of GROUP_FIELD_KEYS) {
    const raw = readString(row[key]);
    if (!raw) continue;
    const stripped = stripVerkaufsbezeichnungLabel(raw);
    if (looksLikeVerkaufsbezeichnung(stripped)) return stripped;
    if (
      stripped.length >= 4 &&
      !looksLikeFahrzeugtypCode(stripped) &&
      !looksLikeAuflagenCode(stripped)
    ) {
      return stripped;
    }
  }
  return null;
}

function rowHasTableData(match: AbeVehicleMatch): boolean {
  return Boolean(
    match.fahrzeugtyp ||
      match.typeApproval ||
      match.driveType ||
      match.tireSizes.length > 0 ||
      match.auflagenCodes.length > 0,
  );
}

function resolveVerkaufsbezeichnung(
  raw: string,
  currentGroup: string | null,
): string | null {
  const stripped = stripVerkaufsbezeichnungLabel(raw);
  if (!stripped) return currentGroup;
  if (looksLikeVerkaufsbezeichnung(stripped)) return stripped;
  if (looksLikeFahrzeugtypCode(stripped)) return currentGroup;
  if (stripped.length >= 4 && !looksLikeAuflagenCode(stripped)) return stripped;
  return currentGroup;
}

function inferDefaultGroupLabel(rawRows: unknown[]): string | null {
  for (const raw of rawRows) {
    const row = readRowRecord(raw);
    if (!row) continue;
    const label = readGroupLabel(row);
    if (label) return label;
  }

  for (const raw of rawRows) {
    const row = readRowRecord(raw);
    if (!row) continue;
    for (const value of Object.values(row)) {
      if (typeof value !== "string") continue;
      const match = /verkaufsbezeichnung\s*:\s*([^\n]+)/i.exec(value);
      if (!match?.[1]) continue;
      const label = stripVerkaufsbezeichnungLabel(match[1]);
      if (label && !looksLikeFahrzeugtypCode(label)) return label;
    }
  }

  return null;
}

const FALLBACK_VERKAUFSBEZEICHNUNG = "Fahrzeugtabelle";

function applyFallbackGroupLabel(matches: AbeVehicleMatch[]): AbeVehicleMatch[] {
  const withData = matches.filter((match) => rowHasTableData(match));
  if (withData.length === 0) return [];

  const labeled = withData.filter((match) => match.verkaufsbezeichnung.trim());
  if (labeled.length > 0) {
    return labeled;
  }

  return withData.map((match) => ({
    ...match,
    verkaufsbezeichnung: FALLBACK_VERKAUFSBEZEICHNUNG,
  }));
}

/**
 * Leniently parse raw LLM rows, carry section headers forward, then normalize.
 */
export function parseAbeVehicleRows(rawRows: unknown[]): AbeVehicleMatch[] {
  let currentVerkaufsbezeichnung = inferDefaultGroupLabel(rawRows);
  const drafts: AbeVehicleMatch[] = [];

  for (const raw of rawRows) {
    const row = readRowRecord(raw);
    if (!row) continue;

    const explicitGroup = readGroupLabel(row);
    if (explicitGroup) {
      currentVerkaufsbezeichnung = explicitGroup;
    }

    const rawGroupCandidate =
      readString(row.verkaufsbezeichnung) ??
      readString(row.model) ??
      readString(row.sectionHeader) ??
      readString(row.group);

    const fahrzeugtyp =
      readString(row.fahrzeugtyp) ??
      (rawGroupCandidate && looksLikeFahrzeugtypCode(rawGroupCandidate)
        ? rawGroupCandidate
        : null);

    const parsedAuflagen = parseAuflagenCodes(readStringArray(row.auflagenCodes));
    const draft: AbeVehicleMatch = {
      verkaufsbezeichnung:
        explicitGroup ??
        currentVerkaufsbezeichnung ??
        (rawGroupCandidate && !looksLikeFahrzeugtypCode(rawGroupCandidate)
          ? stripVerkaufsbezeichnungLabel(rawGroupCandidate)
          : ""),
      fahrzeugtyp,
      typeApproval: readString(row.typeApproval),
      driveType: readString(row.driveType) ?? parsedAuflagen.driveType,
      tireSizes: readStringArray(row.tireSizes),
      auflagenCodes: parsedAuflagen.codes,
    };

    if (!rowHasTableData(draft) && !draft.verkaufsbezeichnung.trim()) {
      continue;
    }

    drafts.push(draft);
  }

  const normalized = normalizeAbeVehicleMatches(drafts);
  return applyFallbackGroupLabel(normalized);
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

    const verkaufsbezeichnung =
      resolvedGroup ??
      currentVerkaufsbezeichnung ??
      stripVerkaufsbezeichnungLabel(match.verkaufsbezeichnung);

    return {
      ...match,
      verkaufsbezeichnung,
      fahrzeugtyp,
      driveType: match.driveType ?? parsedAuflagen.driveType,
      auflagenCodes: parsedAuflagen.codes,
    };
  });
}
