/**
 * ABE list/detail titles: model name (e.g. "Keskin KT15")
 * plus optional part kind (e.g. "Felge").
 */

import { displayDocumentTitle } from "@/lib/documents/format";

const TITLE_MAX = 160;

const GENERIC_ART = /^(other|sonstiges?|abe|teilegutachten|gutachten)$/i;
const KBA_OR_DIGITS = /^(kba\b|\d{4,8})$/i;

const ART_RULES: Array<{ pattern: RegExp; label: string }> = [
  {
    pattern:
      /felge|räder|rader|wheels|leichtmetall|sonderrad|sonderräder|sonderrader/i,
    label: "Felge",
  },
  { pattern: /sportauspuff/i, label: "Sportauspuff" },
  {
    pattern: /auspuff|abgasanlage|exhaust|downpipe|kat[-\s]?ersatz/i,
    label: "Auspuff",
  },
  { pattern: /gewindefahrwerk/i, label: "Gewindefahrwerk" },
  { pattern: /sportfeder/i, label: "Sportfedern" },
  { pattern: /fahrwerk|feder|suspension|tieferlegung/i, label: "Fahrwerk" },
  {
    pattern: /spoiler|frontlippe|aerodynamik|diffuser|seitenschweller/i,
    label: "Aerodynamik",
  },
  { pattern: /ansaugung|luftfilter|cold\s*air|ainnahme/i, label: "Ansaugung" },
  { pattern: /intercooler|ladeluft/i, label: "Intercooler" },
  { pattern: /bremse/i, label: "Bremsen" },
  { pattern: /beleuchtung|scheinwerfer|lighting/i, label: "Beleuchtung" },
];

const ART_ONLY_ALIASES = new Set([
  "felge",
  "felgen",
  "räder",
  "rader",
  "raeder",
  "wheels",
  "leichtmetallfelge",
  "leichtmetallfelgen",
  "leichtmetallrad",
  "leichtmetallräder",
  "sonderrad",
  "sonderräder",
  "sonderrader",
  "fahrwerk",
  "suspension",
  "auspuff",
  "abgasanlage",
  "exhaust",
  "aerodynamik",
  "aerodynamics",
  "beleuchtung",
  "lighting",
  "sportfedern",
  "sportfeder",
  "gewindefahrwerk",
]);

const TYP_IN_DESIGNATION =
  /\btyp(?:enbezeichnung)?\s*[:.]?\s*([A-Z0-9][A-Z0-9._/-]{1,24})/i;

export type AbeTitleFields = {
  manufacturer?: string | null;
  partType?: string | null;
  partCategory?: string | null;
};

export type AbeTitleDocument = {
  title: string;
  type?: string | null;
  manufacturer?: string | null;
  vendor?: string | null;
  part_category?: string | null;
  approval_fields?: { kind?: string | null } | null;
};

function collapseArtKey(value: string): string {
  return value.toLowerCase().replace(/[^a-zäöüß]/g, "");
}

/** Short German part kind for titles — "Felge", not "Räder" / "KBA 48571". */
export function abePartArtLabel(
  value: string | null | undefined,
): string | null {
  const trimmed = value?.trim() ?? "";
  if (!trimmed || GENERIC_ART.test(trimmed) || KBA_OR_DIGITS.test(trimmed)) {
    return null;
  }

  for (const rule of ART_RULES) {
    if (rule.pattern.test(trimmed)) return rule.label;
  }

  if (trimmed.length <= 40 && !/\d{3,}/.test(trimmed) && !/\s[x×]\s/i.test(trimmed)) {
    return trimmed;
  }

  return null;
}

export function isAbeArtOnlyToken(value: string | null | undefined): boolean {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return false;
  const key = collapseArtKey(trimmed);
  if (ART_ONLY_ALIASES.has(key)) return true;
  if (GENERIC_ART.test(trimmed) || KBA_OR_DIGITS.test(trimmed)) return true;
  return false;
}

/**
 * Model token from a long Bauteil-Bezeichnung, e.g.
 * "Sonderräder 8 J x 18 H2 Typ AVAG" → "AVAG".
 */
export function extractAbeModelFromDesignation(
  designation: string | null | undefined,
): string | null {
  const trimmed = designation?.trim() ?? "";
  if (!trimmed || isAbeArtOnlyToken(trimmed)) return null;

  const typ = TYP_IN_DESIGNATION.exec(trimmed);
  if (typ?.[1] && !isAbeArtOnlyToken(typ[1])) return typ[1];

  if (isAbeArtOnlyToken(trimmed.split(/\s+/)[0] ?? "") && /\d+\s*[x×]/i.test(trimmed)) {
    return null;
  }

  if (trimmed.length <= 40 && !/\d+\s*[x×]\s*\d+/i.test(trimmed)) {
    return trimmed;
  }

  return null;
}

function joinBrandAndModel(manufacturer: string, partType: string): string {
  if (manufacturer && partType) {
    if (partType.toLowerCase().startsWith(manufacturer.toLowerCase())) {
      return partType;
    }
    return `${manufacturer} ${partType}`;
  }
  return partType || manufacturer;
}

function modelIncludesArt(model: string, art: string): boolean {
  return model.toLowerCase().includes(art.toLowerCase());
}

/**
 * ABE entry title: "Keskin KT15" or "Keskin KT15 · Felge".
 */
export function titleFromAbeFields(input: AbeTitleFields): string {
  const manufacturer = input.manufacturer?.trim() ?? "";
  const rawType = input.partType?.trim() ?? "";
  const rawCategory = input.partCategory?.trim() ?? "";

  const typeIsArt = isAbeArtOnlyToken(rawType);
  const modelToken = typeIsArt
    ? ""
    : rawType || extractAbeModelFromDesignation(rawCategory) || "";
  const modelName = joinBrandAndModel(manufacturer, modelToken);

  const art =
    abePartArtLabel(rawCategory) ??
    (typeIsArt ? abePartArtLabel(rawType) : null);

  if (modelName && art && !modelIncludesArt(modelName, art)) {
    return `${modelName} · ${art}`.slice(0, TITLE_MAX);
  }

  return (modelName || art || "ABE").slice(0, TITLE_MAX);
}

/** Rebuild list/detail title from stored ABE fields when possible. */
export function displayAbeDocumentTitle(document: AbeTitleDocument): string {
  if (document.type && document.type !== "abe") {
    return displayDocumentTitle(document.title);
  }
  if (document.approval_fields?.kind === "einzelabnahme") {
    return displayDocumentTitle(document.title);
  }

  const hasIdentity = Boolean(
    document.manufacturer?.trim() || document.vendor?.trim(),
  );
  if (!hasIdentity) {
    return displayDocumentTitle(document.title);
  }

  return titleFromAbeFields({
    manufacturer: document.manufacturer,
    partType: document.vendor,
    partCategory: document.part_category,
  });
}
