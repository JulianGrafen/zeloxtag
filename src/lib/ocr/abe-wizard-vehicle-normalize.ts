import type { AbeVehicleMatch } from "@/lib/validations/abeWizardSchemas";
import {
  correctAuflagenKuerzelList,
  getKnownAuflagenKuerzelFromSeed,
} from "@/lib/ocr/auflagen-kuerzel-ocr-correction";

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

const VERKAUFSBEZEICHNUNG_SUFFIX_FRAGMENT =
  /^(?:REIHE|TOURING|COUP[EÉ]|CABRIO|LIMOUSINE|SPORTBACK|GRAN\s+TURISMO|COMPACT|ALLRAD)$/i;

const VERKAUFSBEZEICHNUNG_MODEL_SUFFIX =
  /(-(?:Reihe|Compact|Touring|Coupe|Cabrio|Limousine|Sportback)|\s+(?:REIHE|COMPACT|TOURING|COUP[EÉ]|CABRIO|LIMOUSINE|SPORTBACK|GRAN\s+TURISMO))/i;

/** Canonical label for grouping rows under the same section header. */
export function normalizeVerkaufsbezeichnungKey(value: string): string {
  return value
    .replace(/^verkaufsbezeichnung\s*:\s*/i, "")
    .replace(/\s*,\s*/g, ", ")
    .replace(/\s+/g, " ")
    .trim();
}

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

/** Split glued OCR like `11A12A20B22B744` into individual Kürzel. */
const PACKED_AUFLAGEN_TOKEN_PATTERN =
  /\d{1,2}[A-Za-z]{1,2}|\d{2,3}|[A-Za-z]\d{1,3}[A-Za-z]?|[A-Za-z]{2,4}/g;

function expandPackedAuflagenToken(raw: string): string[] {
  const trimmed = raw.trim().replace(/^[\(\[]+|[\)\].,:;]+$/g, "");
  if (!trimmed) return [];
  if (DRIVE_TYPES.has(trimmed.toLowerCase())) return [trimmed];
  if (looksLikeAuflagenCode(trimmed)) return [trimmed];
  if (!/^[A-Z0-9+]{7,}$/i.test(trimmed)) return [trimmed];

  const packed = trimmed.match(PACKED_AUFLAGEN_TOKEN_PATTERN);
  if (!packed || packed.length < 2) return [trimmed];
  return packed;
}

function tokenizeAuflagenColumnWithRaw(
  items: readonly string[],
): { raw: string; normalized: string }[] {
  return items
    .flatMap((item) => item.trim().split(/[\s,/;]+/))
    .flatMap((token) => expandPackedAuflagenToken(token))
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
  const trimmed = value.trim().replace(/[,;]+$/g, "");
  if (!trimmed) return false;
  return /^\d{3}\s*\/\s*\d{2}\s*Z?R?\s*\d{2}/i.test(trimmed);
}

/** Normalize spacing for display/storage — "225/45R17" → "225/45 R17". */
export function normalizeTireSizeLabel(value: string): string {
  const trimmed = value.trim().replace(/[,;]+$/g, "").trim();
  const match = trimmed.match(/^(\d{3}\s*\/\s*\d{2})\s*(Z?R\s*\d{2})/i);
  if (!match) return trimmed;
  const width = match[1]!.replace(/\s+/g, "");
  const suffix = match[2]!.replace(/\s+/g, "").replace(/^ZR/i, "ZR").replace(/^R/i, "R");
  const normalizedSuffix =
    suffix.startsWith("ZR") || suffix.startsWith("zr")
      ? ` ${suffix.charAt(0).toUpperCase()}${suffix.slice(1, 2)}${suffix.slice(2)}`
      : ` ${suffix.charAt(0).toUpperCase()}${suffix.slice(1)}`;
  return `${width}${normalizedSuffix}`;
}

const TIRE_SIZE_PATTERN = /\b(\d{3}\s*\/\s*\d{2}\s*Z?R\s*\d{2})\b/gi;

/** Extract every tyre dimension printed in a Reifen cell (space/comma/slash separated). */
export function extractTireSizesFromText(text: string): string[] {
  const found: string[] = [];
  const seen = new Set<string>();

  for (const match of text.matchAll(TIRE_SIZE_PATTERN)) {
    const label = normalizeTireSizeLabel(match[1] ?? "");
    const key = label.replace(/\s+/g, "").toUpperCase();
    if (!label || seen.has(key)) continue;
    seen.add(key);
    found.push(label);
  }

  return found;
}

/** Parse one or many raw LLM / OCR tyre values into deduplicated size labels. */
export function parseAllTireSizes(
  values: string | readonly string[] | null | undefined,
): string[] {
  const raw: string[] = [];
  if (typeof values === "string") {
    raw.push(values);
  } else if (Array.isArray(values)) {
    raw.push(...values.filter((entry): entry is string => typeof entry === "string"));
  }

  const out: string[] = [];
  const seen = new Set<string>();

  for (const item of raw) {
    const trimmed = item.trim();
    if (!trimmed) continue;

    const extracted = extractTireSizesFromText(trimmed);
    if (extracted.length > 0) {
      for (const size of extracted) {
        const key = size.replace(/\s+/g, "").toUpperCase();
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(size);
      }
      continue;
    }

    for (const part of trimmed.split(/[,;/]+/)) {
      const token = part.trim();
      if (!token || !looksLikeTireSize(token)) continue;
      const label = normalizeTireSizeLabel(token);
      const key = label.replace(/\s+/g, "").toUpperCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(label);
    }
  }

  return out;
}

function looksLikeKwRange(value: string): boolean {
  return /^\d{2,3}\s*-\s*\d{2,3}$/.test(value.trim());
}

export function looksLikeEgBeApproval(value: string | null | undefined): boolean {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return false;
  return /^(?:e\d{1,2}\*|[eE]\d{1,2}\s)/.test(trimmed) || /e\d{1,2}\*\d/.test(trimmed);
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
    tireSizes: [...new Set(tireSizes.map((size) => normalizeTireSizeLabel(size.trim())).filter(Boolean))],
    auflagenCodes: mergeUniqueAuflagenCodes(auflagenCodes),
  };
}

/**
 * Cropped 5-column tables often shift Fahrzeugtyp into EG-BE / Handelsbezeichnung.
 * Recover the type code before the picker drops rows without `fahrzeugtyp`.
 */
export function recoverFahrzeugtypFromShiftedColumns(
  match: AbeVehicleMatch,
): AbeVehicleMatch {
  let fahrzeugtyp = match.fahrzeugtyp?.trim() || null;
  let typeApproval = match.typeApproval?.trim() || null;
  let auflagenCodes = [...match.auflagenCodes];
  const verkaufsbezeichnung = match.verkaufsbezeichnung.trim();

  if (
    fahrzeugtyp &&
    looksLikeEgBeApproval(fahrzeugtyp) &&
    typeApproval &&
    looksLikeFahrzeugtypCode(typeApproval)
  ) {
    return { ...match, fahrzeugtyp: typeApproval, typeApproval: fahrzeugtyp };
  }

  if (
    fahrzeugtyp &&
    looksLikeEgBeApproval(fahrzeugtyp) &&
    looksLikeFahrzeugtypCode(verkaufsbezeichnung)
  ) {
    return {
      ...match,
      fahrzeugtyp: verkaufsbezeichnung,
      typeApproval: typeApproval ?? fahrzeugtyp,
    };
  }

  if (
    fahrzeugtyp &&
    (looksLikeEgBeApproval(fahrzeugtyp) || fahrzeugtyp.length > 40) &&
    !typeApproval
  ) {
    typeApproval = fahrzeugtyp;
    fahrzeugtyp = null;
  }

  if (
    !fahrzeugtyp &&
    typeApproval &&
    looksLikeFahrzeugtypCode(typeApproval) &&
    !looksLikeEgBeApproval(typeApproval)
  ) {
    fahrzeugtyp = typeApproval;
    typeApproval = null;
  }

  if (!fahrzeugtyp && looksLikeFahrzeugtypCode(verkaufsbezeichnung)) {
    fahrzeugtyp = verkaufsbezeichnung;
  }

  if (!fahrzeugtyp) {
    const promoted = auflagenCodes.find(
      (code) =>
        looksLikeFahrzeugtypCode(code) &&
        !isLikelyAuflagenMisplacedAsFahrzeugtyp(code),
    );
    if (promoted) {
      fahrzeugtyp = promoted;
      auflagenCodes = auflagenCodes.filter((code) => code !== promoted);
    }
  }

  return {
    ...match,
    fahrzeugtyp,
    typeApproval,
    auflagenCodes,
  };
}

function repairMisassignedGutachtenFields(
  match: AbeVehicleMatch,
): AbeVehicleMatch {
  const recovered = recoverFahrzeugtypFromShiftedColumns(match);
  let fahrzeugtyp = recovered.fahrzeugtyp;
  let typeApproval = recovered.typeApproval;
  let tireSizes = [...recovered.tireSizes];
  let auflagenCodes = [...recovered.auflagenCodes];

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
    ...recovered,
    fahrzeugtyp,
    typeApproval,
    tireSizes,
    auflagenCodes,
  };
}

/** Split OCR headers like "-Reihe" / "-Compact" — not a standalone vehicle model. */
export function isFragmentVerkaufsbezeichnung(value: string): boolean {
  const trimmed = stripVerkaufsbezeichnungLabel(value);
  if (!trimmed) return false;
  if (/^-/.test(trimmed)) return true;
  if (VERKAUFSBEZEICHNUNG_SUFFIX_FRAGMENT.test(trimmed)) return true;
  return false;
}

/** Strip model suffix to get join base — "BMW 3er-Reihe" → "BMW 3er". */
export function baseVerkaufsbezeichnungPrefix(
  value: string | null | undefined,
): string | null {
  const trimmed = stripVerkaufsbezeichnungLabel(value ?? "");
  if (!trimmed) return null;

  const suffixMatch = VERKAUFSBEZEICHNUNG_MODEL_SUFFIX.exec(trimmed);
  if (suffixMatch?.index) {
    return trimmed.slice(0, suffixMatch.index).trim() || null;
  }

  return trimmed;
}

/** Merge "BMW 3er" + "-Reihe" → "BMW 3er-Reihe". */
export function joinVerkaufsbezeichnungFragment(
  base: string | null | undefined,
  fragment: string,
): string {
  const frag = stripVerkaufsbezeichnungLabel(fragment);
  const baseTrimmed = base?.trim() ?? "";
  if (!baseTrimmed) {
    return frag.replace(/^-+/, "").trim();
  }
  if (frag.startsWith("-")) {
    if (baseTrimmed.endsWith("-")) {
      return `${baseTrimmed}${frag.slice(1)}`;
    }
    return `${baseTrimmed}${frag}`;
  }
  if (VERKAUFSBEZEICHNUNG_SUFFIX_FRAGMENT.test(frag)) {
    const lowerSuffix =
      frag.toLowerCase() === "gran turismo"
        ? "Gran Turismo"
        : `${frag.charAt(0).toUpperCase()}${frag.slice(1).toLowerCase()}`;
    return `${baseTrimmed}-${lowerSuffix.replace(/\s+/g, "-")}`;
  }
  return `${baseTrimmed} ${frag}`.replace(/\s+/g, " ").trim();
}

function inferSharedModelPrefix(
  matches: readonly AbeVehicleMatch[],
): string | null {
  const counts = new Map<string, number>();

  for (const match of matches) {
    const label = normalizeVerkaufsbezeichnungKey(match.verkaufsbezeichnung);
    if (!label || isFragmentVerkaufsbezeichnung(label)) continue;

    const prefixMatch = VERKAUFSBEZEICHNUNG_MODEL_SUFFIX.exec(label);
    const prefix = prefixMatch?.index
      ? label.slice(0, prefixMatch.index).trim()
      : null;
    if (!prefix) continue;

    counts.set(prefix, (counts.get(prefix) ?? 0) + 1);
  }

  let bestPrefix: string | null = null;
  let bestCount = 0;
  for (const [prefix, count] of counts) {
    if (count > bestCount) {
      bestCount = count;
      bestPrefix = prefix;
    }
  }

  return bestPrefix;
}

/** Repair LLM rows that put "-Reihe" / "-Compact" on data lines instead of full model names. */
export function repairAbeVehicleVerkaufsbezeichnungFragments(
  matches: readonly AbeVehicleMatch[],
): AbeVehicleMatch[] {
  const sharedPrefix = inferSharedModelPrefix(matches);

  return matches.map((match) => {
    const label = stripVerkaufsbezeichnungLabel(match.verkaufsbezeichnung);
    if (!isFragmentVerkaufsbezeichnung(label)) {
      return match;
    }

    return {
      ...match,
      verkaufsbezeichnung: joinVerkaufsbezeichnungFragment(
        sharedPrefix,
        label,
      ),
    };
  });
}

export function looksLikeVerkaufsbezeichnung(value: string): boolean {
  const trimmed = stripVerkaufsbezeichnungLabel(value);
  if (!trimmed) return false;
  if (isFragmentVerkaufsbezeichnung(trimmed)) return false;
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

/** Digit+letter families beyond the seed (20B, 22B, A77). One-digit junk like K7C stays out. */
const STANDARD_AUFLAGEN_PATTERN =
  /^(?:\d{2,3}|\d{1,2}[A-Z]{1,2}|[A-Z]\d{2,3}[A-Z]?)$/;

function filterAuflagenCodesToTrustedDictionary(
  codes: readonly string[],
): string[] {
  const known = getKnownAuflagenKuerzelFromSeed();
  return mergeUniqueAuflagenCodes(
    codes.filter((code) => {
      const normalized = normalizeAuflagenToken(code);
      if (!normalized) return false;
      if (known.has(normalized)) return true;
      return STANDARD_AUFLAGEN_PATTERN.test(normalized);
    }),
  );
}

/** Drop tire-only LLM rows that lack Fahrzeugtyp and EG-BE — common table bleed. */
export function dropIncompleteVehicleTableRows(
  matches: readonly AbeVehicleMatch[],
): AbeVehicleMatch[] {
  return matches.filter(
    (row) =>
      Boolean(row.fahrzeugtyp?.trim()) ||
      Boolean(row.typeApproval?.trim()),
  );
}

/** Keep dictionary, numeric, and standard digit/letter Auflagen; drop letter-only junk. */
export function filterKnownAuflagenCodes(codes: readonly string[]): string[] {
  return filterAuflagenCodesToTrustedDictionary(codes);
}

/** Fahrzeugtyp codes (F40, K40, T67) must never appear as Auflagen-Kürzel. */
export function collectFahrzeugtypCodes(
  matches: readonly AbeVehicleMatch[],
): Set<string> {
  const out = new Set<string>();
  for (const match of matches) {
    const code = match.fahrzeugtyp?.trim();
    if (code) out.add(normalizeAuflagenToken(code));
  }
  return out;
}

export function filterAuflagenCodesAgainstFahrzeugtyp(
  codes: readonly string[],
  rowFahrzeugtyp: string | null,
  tableFahrzeugtypCodes: ReadonlySet<string>,
  promotedCodes: ReadonlySet<string> = new Set(),
): string[] {
  const rowTyp = rowFahrzeugtyp
    ? normalizeAuflagenToken(rowFahrzeugtyp)
    : null;

  return mergeUniqueAuflagenCodes(
    codes.filter((code) => {
      const normalized = normalizeAuflagenToken(code);
      if (!normalized) return false;
      if (promotedCodes.has(normalized)) return true;
      if (rowTyp && normalized === rowTyp) return false;
      if (tableFahrzeugtypCodes.has(normalized)) return false;
      return true;
    }),
  );
}

/** Keep only short Auflagen codes; drop drive-type words and stray text. */
export function parseAuflagenCodes(
  auflagenItems: readonly string[],
): { codes: string[]; driveType: string | null } {
  const rawContext = auflagenItems.join(" ");
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

  return {
    codes: filterAuflagenCodesToTrustedDictionary(
      correctAuflagenKuerzelList(mergeUniqueAuflagenCodes(codes), {
        rawContext,
      }),
    ),
    driveType,
  };
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

/** Merge split Auflagen columns (+ legacy single field) from raw LLM rows. */
export function readMergedAuflagenCodesFromRow(
  row: Record<string, unknown>,
): string[] {
  return [
    ...readStringArray(row.reifenbezogeneAuflagenCodes),
    ...readStringArray(row.auflagenUndHinweiseCodes),
    ...readStringArray(row.auflagenCodes),
  ];
}

function readTireSizes(row: Record<string, unknown>): string[] {
  const collected: string[] = [];

  collected.push(...readStringArray(row.tireSizes));

  for (const key of ["reifen", "radSizes", "radgroesse", "radgroessen"] as const) {
    const alt = row[key];
    if (Array.isArray(alt)) {
      collected.push(...readStringArray(alt));
    } else if (typeof alt === "string" && alt.trim()) {
      collected.push(alt);
    }
  }

  const tireSizeString = readString(row.tire_size);
  if (tireSizeString) collected.push(tireSizeString);

  return parseAllTireSizes(collected);
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
    if (isFragmentVerkaufsbezeichnung(stripped)) continue;
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
  if (isFragmentVerkaufsbezeichnung(stripped)) {
    const base =
      baseVerkaufsbezeichnungPrefix(currentGroup) ?? currentGroup;
    return base
      ? joinVerkaufsbezeichnungFragment(base, stripped)
      : currentGroup;
  }
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

function vehicleRowDedupKey(row: AbeVehicleMatch): string {
  return [
    row.verkaufsbezeichnung.trim().toUpperCase(),
    (row.fahrzeugtyp ?? "").trim().toUpperCase(),
    (row.typeApproval ?? "").trim().toUpperCase(),
  ].join("|");
}

/** Merge vehicle rows from multiple LLM passes (primary + retry). */
export function mergeAbeVehicleMatchRows(
  ...lists: readonly (readonly AbeVehicleMatch[])[]
): AbeVehicleMatch[] {
  const byKey = new Map<string, AbeVehicleMatch>();

  for (const list of lists) {
    for (const row of list) {
      const key = vehicleRowDedupKey(row);
      const existing = byKey.get(key);
      if (!existing) {
        byKey.set(key, row);
        continue;
      }

      byKey.set(key, {
        ...existing,
        verkaufsbezeichnung:
          existing.verkaufsbezeichnung.trim() ||
          row.verkaufsbezeichnung.trim() ||
          existing.verkaufsbezeichnung,
        fahrzeugtyp: existing.fahrzeugtyp ?? row.fahrzeugtyp,
        typeApproval: existing.typeApproval ?? row.typeApproval,
        driveType: existing.driveType ?? row.driveType,
        tireSizes: parseAllTireSizes([
          ...existing.tireSizes,
          ...row.tireSizes,
        ]),
        auflagenCodes: mergeUniqueAuflagenCodes([
          ...existing.auflagenCodes,
          ...row.auflagenCodes,
        ]),
      });
    }
  }

  return [...byKey.values()];
}

function fahrzeugtyp38Variants(code: string): string[] {
  const variants = new Set<string>([code]);
  for (let index = 0; index < code.length; index += 1) {
    const ch = code[index];
    if (ch !== "3" && ch !== "8") continue;
    variants.add(
      `${code.slice(0, index)}${ch === "3" ? "8" : "3"}${code.slice(index + 1)}`,
    );
  }
  return [...variants];
}

function scoreFahrzeugtyp38Variant(
  variant: string,
  original: string,
  peerCodes: ReadonlySet<string>,
  context: string,
): number {
  if (variant === original) return 0;

  const upper = variant.toUpperCase();
  const contextUpper = context.toUpperCase();
  let score = 0;

  if (peerCodes.has(upper)) score += 20;
  if (contextUpper.includes(upper)) score += 15;

  if (looksLikeFahrzeugtypCode(variant) && !looksLikeFahrzeugtypCode(original)) {
    score += 5;
  }

  return score;
}

/** Fix common OCR 3↔8 swaps in Fahrzeugtyp codes using peer rows and raw context. */
export function correctFahrzeugtypDigitConfusions(
  code: string,
  peerCodes: ReadonlySet<string> = new Set(),
  rawContext = "",
): string {
  const trimmed = code.trim();
  if (!trimmed || !/[38]/.test(trimmed)) return trimmed;

  let best = trimmed;
  let bestScore = 0;

  for (const variant of fahrzeugtyp38Variants(trimmed)) {
    const score = scoreFahrzeugtyp38Variant(
      variant,
      trimmed,
      peerCodes,
      rawContext,
    );
    if (score > bestScore) {
      bestScore = score;
      best = variant;
    }
  }

  return bestScore >= 10 ? best : trimmed;
}

function splitFahrzeugtypTokens(value: string): string[] {
  return value
    .split(/[,;]+/)
    .map((part) => part.trim())
    .filter((part) => looksLikeFahrzeugtypCode(part));
}

/** One table line with "346C, 346R" becomes two vehicle rows. */
export function expandMultiFahrzeugtypRows(
  matches: readonly AbeVehicleMatch[],
): AbeVehicleMatch[] {
  const out: AbeVehicleMatch[] = [];

  for (const match of matches) {
    const rawTyp = match.fahrzeugtyp?.trim();
    if (!rawTyp) {
      out.push(match);
      continue;
    }

    const codes = splitFahrzeugtypTokens(rawTyp);
    if (codes.length <= 1) {
      out.push(match);
      continue;
    }

    for (const code of codes) {
      out.push({ ...match, fahrzeugtyp: code });
    }
  }

  return out;
}

function correctVehicleMatchDigitConfusions(
  matches: readonly AbeVehicleMatch[],
): AbeVehicleMatch[] {
  const peerCodes = collectFahrzeugtypCodes(matches);
  const context = matches
    .map((row) =>
      [row.verkaufsbezeichnung, row.fahrzeugtyp, row.typeApproval].join(" "),
    )
    .join("\n");

  return matches.map((row) => ({
    ...row,
    fahrzeugtyp: row.fahrzeugtyp
      ? correctFahrzeugtypDigitConfusions(row.fahrzeugtyp, peerCodes, context)
      : null,
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

    const rawGroupStripped = rawGroupCandidate
      ? stripVerkaufsbezeichnungLabel(rawGroupCandidate)
      : null;
    if (rawGroupStripped && isFragmentVerkaufsbezeichnung(rawGroupStripped)) {
      const joinBase =
        baseVerkaufsbezeichnungPrefix(currentVerkaufsbezeichnung) ??
        currentVerkaufsbezeichnung;
      currentVerkaufsbezeichnung = joinVerkaufsbezeichnungFragment(
        joinBase,
        rawGroupStripped,
      );
    }

    const mergedAuflagenCodes = readMergedAuflagenCodesFromRow(row);
    const rawAuflagenTokens = mergedAuflagenCodes
      .flatMap((item) => item.split(/[\s,/;]+/))
      .map((token) => token.trim())
      .filter(Boolean);
    const typFromAuflagen = rawAuflagenTokens.find(
      (token) =>
        looksLikeFahrzeugtypCode(token) &&
        !isLikelyAuflagenMisplacedAsFahrzeugtyp(token),
    );

    const fahrzeugtyp =
      readString(row.fahrzeugtyp) ??
      (rawGroupCandidate && looksLikeFahrzeugtypCode(rawGroupCandidate)
        ? rawGroupCandidate
        : null) ??
      typFromAuflagen ??
      null;

    const parsedAuflagen = parseAuflagenCodes(mergedAuflagenCodes);
    const draft: AbeVehicleMatch = {
      verkaufsbezeichnung:
        (rawGroupStripped && isFragmentVerkaufsbezeichnung(rawGroupStripped)
          ? currentVerkaufsbezeichnung
          : null) ??
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

  const expanded = expandMultiFahrzeugtypRows(drafts);
  const normalized = normalizeAbeVehicleMatches(expanded);
  const repairedLabels = repairAbeVehicleVerkaufsbezeichnungFragments(normalized);
  const relabeled = normalizeAbeVehicleMatches(repairedLabels);
  const corrected = correctVehicleMatchDigitConfusions(relabeled);
  return applyFallbackGroupLabel(dropIncompleteVehicleTableRows(corrected));
}

/**
 * Normalize extracted rows: carry Verkaufsbezeichnung headers across groups,
 * clean Auflagen codes, preserve Fahrzeugtyp separately.
 */
export function normalizeAbeVehicleMatches(
  matches: AbeVehicleMatch[],
): AbeVehicleMatch[] {
  let currentVerkaufsbezeichnung: string | null = null;
  const fahrzeugtypCodes = collectFahrzeugtypCodes(matches);

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

    const verkaufsbezeichnung =
      resolvedGroup ??
      currentVerkaufsbezeichnung ??
      stripVerkaufsbezeichnungLabel(match.verkaufsbezeichnung);

    const repaired = repairMisassignedGutachtenFields({
      ...match,
      verkaufsbezeichnung,
      fahrzeugtyp: fahrzeugtypRaw,
      driveType: match.driveType ?? parsedAuflagen.driveType,
      auflagenCodes: parsedAuflagen.codes,
    });

    let fahrzeugtyp = repaired.fahrzeugtyp;
    let auflagenCodes = repaired.auflagenCodes;
    const promotedFromFahrzeugtyp = new Set<string>();

    if (fahrzeugtyp && isLikelyAuflagenMisplacedAsFahrzeugtyp(fahrzeugtyp)) {
      const promoted = normalizeAuflagenToken(fahrzeugtyp);
      promotedFromFahrzeugtyp.add(promoted);
      auflagenCodes = mergeUniqueAuflagenCodes([...auflagenCodes, promoted]);
      fahrzeugtyp = null;
    }

    return {
      ...repaired,
      fahrzeugtyp,
      tireSizes: parseAllTireSizes(repaired.tireSizes),
      auflagenCodes: correctAuflagenKuerzelList(
        filterAuflagenCodesAgainstFahrzeugtyp(
          auflagenCodes,
          fahrzeugtyp,
          fahrzeugtypCodes,
          promotedFromFahrzeugtyp,
        ),
        {
          allowlist: auflagenCodes,
          rawContext: match.auflagenCodes.join(" "),
        },
      ),
    };
  });
}
