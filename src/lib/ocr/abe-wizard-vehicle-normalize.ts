import type { AbeVehicleMatch } from "@/lib/validations/abeWizardSchemas";
import { normalizeVerkaufsbezeichnungKey } from "@/lib/ocr/abe-wizard-vehicle-match";

const DRIVE_TYPES = new Set([
  "allradantrieb",
  "heckantrieb",
  "frontantrieb",
]);

const FAHRZEUGTYP_PATTERN =
  /^(?:\d{1,2}[a-zA-Z]?-\w+|\d{1,2}[a-zA-Z]?|\d{1,2}\/[A-Z]{1,3}|\d{3}[A-Z]?|[a-zA-Z]-\w+|[a-zA-Z]\d{1,2})$/;

const STRICT_AUFlagen_CODE_PATTERN =
  /^(?:\d{2,3}|\d{1,2}[A-Z]{1,2}|[A-Z]\d{1,3}[A-Z]?|[A-Z]{2,4})$/;

const LETTER_AUFlagen_CODE_PATTERN = /^[A-Z]{2,3}$/;

const VERKAUFSBEZEICHNUNG_HINT =
  /\b(REIHE|TOURING|COUP[EÉ]|CABRIO|LIMOUSINE|SPORTBACK|GRAN\s+TURISMO|MODELL|SERIE|COMPACT|ALLRAD)\b/i;

const GROUP_FIELD_KEYS = [
  "verkaufsbezeichnung",
  "handelsbezeichnung",
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
  const trimmed = normalizeAuflagenToken(value);
  if (!trimmed) return false;
  if (DRIVE_TYPES.has(trimmed.toLowerCase())) return false;
  if (trimmed.length > 6) return false;
  return STRICT_AUFlagen_CODE_PATTERN.test(trimmed);
}

function normalizeAuflagenToken(value: string): string {
  return value
    .trim()
    .replace(/^[\(\[]+|[\)\].,:;]+$/g, "")
    .toUpperCase();
}

/** F40 / L04 — often mis-OCR'd into the Fahrzeugtyp column (unlike 5L, 3k-N1). */
export function isLikelyAuflagenMisplacedAsFahrzeugtyp(
  value: string | null | undefined,
): boolean {
  const trimmed = normalizeAuflagenToken(value ?? "");
  if (!trimmed) return false;
  return /^[A-Z]\d{2,3}$/.test(trimmed) && looksLikeStrictAuflagenCode(trimmed);
}

function tokenizeAuflagenColumnWithRaw(
  items: readonly string[],
): { raw: string; normalized: string }[] {
  return items
    .flatMap((item) => item.trim().split(/[\s,/;]+/))
    .map((token) => ({
      raw: token.trim().replace(/^[\(\[]+|[\)\].,:;]+$/g, ""),
      normalized: normalizeAuflagenToken(token),
    }))
    .filter((token) => token.normalized.length > 0);
}

function coalesceSplitAuflagenTokens(
  tokens: { raw: string; normalized: string }[],
): { raw: string; normalized: string }[] {
  const out: { raw: string; normalized: string }[] = [];
  let index = 0;

  while (index < tokens.length) {
    const current = tokens[index]!;
    const next = tokens[index + 1];

    if (/^[A-Z]$/i.test(current.normalized) && next) {
      out.push({
        raw: `${current.raw}${next.raw}`,
        normalized: `${current.normalized}${next.normalized}`,
      });
      index += 2;
      continue;
    }

    out.push(current);
    index += 1;
  }

  return out;
}

export function looksLikeLetterAuflagenCode(value: string): boolean {
  const trimmed = normalizeAuflagenToken(value);
  if (!trimmed) return false;
  if (DRIVE_TYPES.has(trimmed.toLowerCase())) return false;
  return LETTER_AUFlagen_CODE_PATTERN.test(trimmed);
}

export function looksLikeAuflagenCode(value: string): boolean {
  return (
    looksLikeStrictAuflagenCode(value) ||
    looksLikeLetterAuflagenCode(value)
  );
}

export function looksLikeTireSize(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  return /^\d{3}\/\d{2}\s*Z?R?\d{2}/i.test(trimmed);
}

function looksLikeKwRange(value: string): boolean {
  return /^\d{2,3}\s*-\s*\d{2,3}$/.test(value.trim());
}

function coalesceTireSizeTokens(parts: string[]): string[] {
  const tires: string[] = [];
  let index = 0;

  while (index < parts.length) {
    const current = parts[index]!;
    if (looksLikeTireSize(current)) {
      tires.push(current);
      index += 1;
      continue;
    }

    const next = parts[index + 1];
    if (/^\d{3}\/\d{2}$/.test(current) && next && /^Z?R?\d{2}$/i.test(next)) {
      tires.push(`${current}${next.startsWith("R") || next.startsWith("r") ? " " : ""}${next}`);
      index += 2;
      continue;
    }

    index += 1;
  }

  return tires;
}

function splitMixedTireAndAuflagenTokens(items: readonly string[]): {
  tireSizes: string[];
  auflagenCodes: string[];
} {
  const tireSizes: string[] = [];
  const auflagenCodes: string[] = [];

  for (const item of items) {
    const parts = item.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) continue;

    if (parts.length === 1) {
      if (looksLikeTireSize(parts[0]!)) {
        tireSizes.push(parts[0]!);
      } else {
        auflagenCodes.push(...parseAuflagenCodes(parts).codes);
      }
      continue;
    }

    tireSizes.push(...coalesceTireSizeTokens(parts));

    for (const part of parts) {
      if (looksLikeTireSize(part)) continue;
      if (/^\d{3}\/\d{2}$/.test(part)) continue;
      if (/^Z?R?\d{2}$/i.test(part)) continue;
      if (looksLikeAuflagenCode(part)) {
        auflagenCodes.push(part);
      }
    }
  }

  return {
    tireSizes: [...new Set(tireSizes.map((size) => size.trim()).filter(Boolean))],
    auflagenCodes: mergeUniqueAuflagenCodes(auflagenCodes),
  };
}

function repairMisassignedGutachtenFields(
  match: AbeVehicleMatch,
): AbeVehicleMatch {
  let fahrzeugtyp = match.fahrzeugtyp;
  let typeApproval = match.typeApproval;
  let tireSizes = [...match.tireSizes];
  let auflagenCodes = [...match.auflagenCodes];

  if (fahrzeugtyp && looksLikeKwRange(fahrzeugtyp)) {
    fahrzeugtyp = null;
  }

  if (typeApproval && looksLikeTireSize(typeApproval)) {
    tireSizes.push(typeApproval);
    typeApproval = null;
  }

  if (typeApproval && looksLikeKwRange(typeApproval)) {
    typeApproval = null;
  }

  const splitTires = splitMixedTireAndAuflagenTokens(tireSizes);
  tireSizes = splitTires.tireSizes;
  auflagenCodes = mergeUniqueAuflagenCodes([
    ...auflagenCodes,
    ...splitTires.auflagenCodes,
  ]);

  return {
    ...match,
    fahrzeugtyp,
    typeApproval,
    tireSizes,
    auflagenCodes,
  };
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
  return tokenizeAuflagenColumnWithRaw(items).map((token) => token.normalized);
}

function mergeUniqueAuflagenCodes(codes: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const code of codes) {
    const normalized = normalizeAuflagenToken(code);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }
  return out;
}

/** Keep only short Auflagen codes; drop drive-type words and stray text. */
export function parseAuflagenCodes(
  auflagenItems: readonly string[],
): { codes: string[]; driveType: string | null } {
  const tokens = coalesceSplitAuflagenTokens(
    tokenizeAuflagenColumnWithRaw(auflagenItems),
  );
  const codes: string[] = [];
  let driveType: string | null = null;

  for (const token of tokens) {
    const lower = token.raw.toLowerCase();
    if (DRIVE_TYPES.has(lower)) {
      driveType ??= token.raw;
      continue;
    }
    if (looksLikeAuflagenCode(token.normalized)) {
      codes.push(token.normalized);
    }
  }

  return { codes: mergeUniqueAuflagenCodes(codes), driveType };
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

function readTireSizes(row: Record<string, unknown>): string[] {
  const fromArray = readStringArray(row.tireSizes);
  if (fromArray.length > 0) return fromArray;

  for (const key of ["reifen", "radSizes", "radgroesse", "radgroessen"] as const) {
    const alt = row[key];
    if (Array.isArray(alt)) {
      const parsed = readStringArray(alt);
      if (parsed.length > 0) return parsed;
    }
    if (typeof alt === "string" && alt.trim()) {
      return alt
        .split(/[,;/]+/)
        .map((part) => part.trim())
        .filter(Boolean);
    }
  }

  return [];
}

function readTypeApproval(row: Record<string, unknown>): string | null {
  return (
    readString(row.typeApproval) ??
    readString(row.betriebserlaubnis) ??
    readString(row.technischeBezeichnung) ??
    readString(row.egBe)
  );
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
      const match = /(?:verkaufsbezeichnung|handelsbezeichnung)\s*:\s*([^\n]+)/i.exec(
        value,
      );
      if (!match?.[1]) continue;
      const label = stripVerkaufsbezeichnungLabel(match[1]);
      if (label && !looksLikeFahrzeugtypCode(label)) return label;
    }
  }

  return null;
}

export const ABE_FALLBACK_VERKAUFSBEZEICHNUNG = "Fahrzeugtabelle";

export function isPlaceholderAbeVerkaufsbezeichnung(
  value: string | null | undefined,
): boolean {
  const trimmed = value?.trim();
  if (!trimmed) return true;
  return (
    trimmed.toUpperCase() === ABE_FALLBACK_VERKAUFSBEZEICHNUNG.toUpperCase()
  );
}

function applyFallbackGroupLabel(matches: AbeVehicleMatch[]): AbeVehicleMatch[] {
  const withData = matches.filter((match) => rowHasTableData(match));
  if (withData.length === 0) return [];

  const labeled = withData.filter((match) => match.verkaufsbezeichnung.trim());
  if (labeled.length > 0) {
    return labeled;
  }

  return withData.map((match) => ({
    ...match,
    verkaufsbezeichnung: ABE_FALLBACK_VERKAUFSBEZEICHNUNG,
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
      readString(row.handelsbezeichnung) ??
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
      typeApproval: readTypeApproval(row),
      driveType: readString(row.driveType) ?? parsedAuflagen.driveType,
      tireSizes: readTireSizes(row),
      auflagenCodes: parsedAuflagen.codes,
    };

    if (!rowHasTableData(draft) && !draft.verkaufsbezeichnung.trim()) {
      continue;
    }

    if (
      !rowHasTableData(draft) &&
      draft.verkaufsbezeichnung.trim() &&
      looksLikeVerkaufsbezeichnung(draft.verkaufsbezeichnung)
    ) {
      currentVerkaufsbezeichnung = normalizeVerkaufsbezeichnungKey(
        draft.verkaufsbezeichnung,
      );
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

    const fahrzeugtypRaw =
      match.fahrzeugtyp?.trim() ||
      (looksLikeFahrzeugtypCode(match.verkaufsbezeichnung)
        ? match.verkaufsbezeichnung.trim()
        : null);

    let fahrzeugtyp = fahrzeugtypRaw;
    let auflagenCodes = parsedAuflagen.codes;

    if (fahrzeugtyp && isLikelyAuflagenMisplacedAsFahrzeugtyp(fahrzeugtyp)) {
      auflagenCodes = mergeUniqueAuflagenCodes([
        ...auflagenCodes,
        fahrzeugtyp,
      ]);
      fahrzeugtyp = null;
    }

    const verkaufsbezeichnung =
      resolvedGroup ??
      currentVerkaufsbezeichnung ??
      stripVerkaufsbezeichnungLabel(match.verkaufsbezeichnung);

    return repairMisassignedGutachtenFields({
      ...match,
      verkaufsbezeichnung,
      fahrzeugtyp,
      driveType: match.driveType ?? parsedAuflagen.driveType,
      auflagenCodes,
    });
  });
}
