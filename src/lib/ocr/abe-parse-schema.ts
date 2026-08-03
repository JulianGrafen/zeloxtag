import { z } from "zod";

/**
 * Core ABE metadata — intentionally lean (no Verwendungsbereich / fitment tables).
 * Keep Zod + OpenAI JSON Schema in sync.
 */

export const ABE_PART_CATEGORIES = [
  "suspension",
  "exhaust",
  "wheels",
  "aerodynamics",
  "lighting",
  "other",
] as const;

export type AbePartCategory = (typeof ABE_PART_CATEGORIES)[number];

/** German UI / DB labels for `documents.part_category`. */
export const ABE_PART_CATEGORY_LABELS: Record<AbePartCategory, string> = {
  suspension: "Fahrwerk",
  exhaust: "Abgasanlage",
  wheels: "Räder",
  aerodynamics: "Aerodynamik",
  lighting: "Beleuchtung",
  other: "Sonstiges",
};

const PART_CATEGORY_ALIASES: Record<string, AbePartCategory> = {
  suspension: "suspension",
  fahrwerk: "suspension",
  federn: "suspension",
  exhaust: "exhaust",
  abgasanlage: "exhaust",
  auspuff: "exhaust",
  wheels: "wheels",
  räder: "wheels",
  rader: "wheels",
  felgen: "wheels",
  aerodynamics: "aerodynamics",
  aerodynamik: "aerodynamics",
  frontlippe: "aerodynamics",
  spoiler: "aerodynamics",
  lighting: "lighting",
  beleuchtung: "lighting",
  scheinwerfer: "lighting",
  other: "other",
  sonstiges: "other",
  sonstige: "other",
};

export const abeCoreParseSchema = z.object({
  kbaNumber: z.string().trim().min(1).max(80).nullable(),
  manufacturer: z.string().trim().min(1).max(120).nullable(),
  partCategory: z.enum(ABE_PART_CATEGORIES),
  partType: z.string().trim().min(1).max(160).nullable(),
});

export type AbeCoreParseResult = z.infer<typeof abeCoreParseSchema>;

export const ABE_CORE_PARSE_JSON_SCHEMA = {
  name: "abe_core_parse",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["kbaNumber", "manufacturer", "partCategory", "partType"],
    properties: {
      kbaNumber: {
        type: ["string", "null"],
        description:
          "KBA approval number as 'KBA' + 5 digits (e.g. 'KBA 91234'). Extract digits even if OCR splits 'KBA' and the number across lines. Null if unreadable.",
      },
      manufacturer: {
        type: ["string", "null"],
        description:
          "Company that built the part or holds the ABE (e.g. AutoExe, Milltek, OZ). Not the vehicle make.",
      },
      partCategory: {
        type: "string",
        enum: [...ABE_PART_CATEGORIES],
        description: "Part family classification.",
      },
      partType: {
        type: ["string", "null"],
        description:
          "Exact model / type designation of the part (e.g. 'Carbon Frontlippe', 'TEIN Flex Z').",
      },
    },
  },
} as const;

export function coerceAbePartCategory(
  value: string | null | undefined,
): AbePartCategory {
  if (!value) return "other";
  const key = value.trim().toLowerCase();
  if ((ABE_PART_CATEGORIES as readonly string[]).includes(key)) {
    return key as AbePartCategory;
  }
  return PART_CATEGORY_ALIASES[key] ?? "other";
}

export function abePartCategoryLabel(category: AbePartCategory): string {
  return ABE_PART_CATEGORY_LABELS[category];
}

/** Normalize KBA strings toward `KBA #####` when digits are present. */
export function normalizeKbaNumber(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim().slice(0, 80);
  if (!trimmed) return null;

  const digits = trimmed.match(/(?:KBA[\s.\-]*)?(\d{5})\b/i);
  if (digits?.[1]) {
    return `KBA ${digits[1]}`;
  }

  return trimmed;
}

export function normalizeAbeCoreParseResult(
  fields: AbeCoreParseResult,
): AbeCoreParseResult {
  return {
    kbaNumber: normalizeKbaNumber(fields.kbaNumber),
    manufacturer: fields.manufacturer?.trim().slice(0, 120) || null,
    partCategory: coerceAbePartCategory(fields.partCategory),
    partType: fields.partType?.trim().slice(0, 160) || null,
  };
}

export function emptyAbeCoreFields(): AbeCoreParseResult {
  return {
    kbaNumber: null,
    manufacturer: null,
    partCategory: "other",
    partType: null,
  };
}
