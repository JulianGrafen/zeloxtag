import { z } from "zod";

/**
 * Core ABE metadata — lean (no Verwendungsbereich / fitment tables).
 * Includes fully worded Auflagen. Keep Zod + OpenAI JSON Schema in sync.
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

export const ABE_CONDITION_MAX_LENGTH = 1_200;
export const ABE_CONDITION_MAX_ITEMS = 40;

export const abeTechnicalSpecSchema = z.object({
  label: z.string().trim().min(1).max(80),
  value: z.string().trim().min(1).max(160),
});

export type AbeTechnicalSpec = z.infer<typeof abeTechnicalSpecSchema>;

export const abeCoreParseSchema = z.object({
  kbaNumber: z.string().trim().min(1).max(80).nullable(),
  manufacturer: z.string().trim().min(1).max(120).nullable(),
  partCategory: z.enum(ABE_PART_CATEGORIES),
  partType: z.string().trim().min(1).max(160).nullable(),
  /** Scan date as YYYY-MM-DD (set client-side; not document issue date). */
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD")
    .nullable(),
  /** Full wording of each Auflage — not summaries. */
  conditions: z
    .array(z.string().trim().min(1).max(ABE_CONDITION_MAX_LENGTH))
    .max(ABE_CONDITION_MAX_ITEMS)
    .nullable(),
  /** Technical dimensions / Maße from the ABE (ET, width, diameter, …). */
  technicalSpecs: z.array(abeTechnicalSpecSchema).max(40).nullable(),
});

export type AbeCoreParseResult = z.infer<typeof abeCoreParseSchema>;

export const ABE_CORE_PARSE_JSON_SCHEMA = {
  name: "abe_core_parse",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "kbaNumber",
      "manufacturer",
      "partCategory",
      "partType",
      "date",
      "conditions",
      "technicalSpecs",
    ],
    properties: {
      kbaNumber: {
        type: ["string", "null"],
        description:
          "KBA approval number, usually 'KBA' + 5 digits (e.g. 'KBA 91234'). Null if unreadable.",
      },
      manufacturer: {
        type: ["string", "null"],
        description:
          "Part manufacturer / Herstellerzeichen only (e.g. AutoExe, Milltek, OZ). NEVER Auftraggeber, Antragsteller, Besteller, Inverkehrbringer, Importeur, or Vertreiber — those are different parties. Not the vehicle make. Null if only Auftraggeber is readable.",
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
      date: {
        type: ["string", "null"],
        description:
          "Always null from OCR — the app stores the scan date client-side, not the document issue date.",
      },
      conditions: {
        type: ["array", "null"],
        description:
          "Each Auflage as COMPLETE original wording (full sentences, no shortening). One entry per numbered Auflage. Null if none found.",
        items: { type: "string" },
      },
      technicalSpecs: {
        type: ["array", "null"],
        description:
          "Technical dimensions / Maßcodes from the ABE: ET, Felgengröße, Durchmesser, Lochkreis, Mittenloch, Gewicht, Abmessungen, AND cryptic alphanumeric codes that include a diameter glyph (Ø/⌀/ø), e.g. '8Jx18 Ø72,6' or 'A12B Ø67,1 mm'. One {label, value} per measure. Null if none.",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["label", "value"],
          properties: {
            label: {
              type: "string",
              description:
                "Measure name, e.g. 'Einpresstiefe (ET)', 'Durchmesser', 'Maßcode', 'Felgengröße'.",
            },
            value: {
              type: "string",
              description:
                "Measure value / code with unit or Ø, e.g. '35 mm', '8,5 J x 18', '8Jx18 Ø72,6'.",
            },
          },
        },
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

export function normalizeAbeConditions(
  values: string[] | null | undefined,
): string[] | null {
  if (!values?.length) return null;
  const cleaned = values
    .map((value) => value.trim().replace(/\s+/g, " ").slice(0, ABE_CONDITION_MAX_LENGTH))
    .filter(Boolean)
    .slice(0, ABE_CONDITION_MAX_ITEMS);
  return cleaned.length > 0 ? cleaned : null;
}

export function normalizeAbeTechnicalSpecs(
  values: AbeTechnicalSpec[] | null | undefined,
): AbeTechnicalSpec[] | null {
  if (!values?.length) return null;
  const cleaned = values
    .map((item) => ({
      label: item.label.trim().replace(/\s+/g, " ").slice(0, 80),
      value: item.value.trim().replace(/\s+/g, " ").slice(0, 160),
    }))
    .filter((item) => item.label.length > 0 && item.value.length > 0)
    .slice(0, 40);
  return cleaned.length > 0 ? cleaned : null;
}

/** Normalize to YYYY-MM-DD or null. */
export function normalizeAbeDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const [year, month, day] = trimmed.split("-").map(Number);
  if (!year || !month || !day) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  if (year < 1980 || year > 2100) return null;
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
    date: normalizeAbeDate(fields.date),
    conditions: normalizeAbeConditions(fields.conditions),
    technicalSpecs: normalizeAbeTechnicalSpecs(fields.technicalSpecs),
  };
}

export function emptyAbeCoreFields(): AbeCoreParseResult {
  return {
    kbaNumber: null,
    manufacturer: null,
    partCategory: "other",
    partType: null,
    date: null,
    conditions: null,
    technicalSpecs: null,
  };
}
