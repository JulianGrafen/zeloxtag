import { z } from "zod";

/**
 * Core ABE metadata including Freigabe (vehicle makes/models).
 * Keep Zod + OpenAI JSON Schema in sync.
 */

export const ABE_VEHICLE_APPROVAL_MAX_LENGTH = 120;
export const ABE_VEHICLE_APPROVAL_MAX_ITEMS = 40;

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
  /**
   * Freigabe / Verwendungsbereich — vehicle manufacturer + model names.
   * Never bare type codes, HSN/TSN, or page numbers alone.
   */
  vehicleApprovals: z
    .array(z.string().trim().min(2).max(ABE_VEHICLE_APPROVAL_MAX_LENGTH))
    .max(ABE_VEHICLE_APPROVAL_MAX_ITEMS)
    .nullable(),
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
      "vehicleApprovals",
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
          "Part manufacturer / Herstellerzeichen / Genehmigungsinhaber / Marke (e.g. AutoExe, Milltek, OZ, H&R). Short mark codes are valid. If Hersteller and Auftraggeber are the same company, still return that name. Not the vehicle make, not a street address. Null only if no Hersteller/Marke/Inhaber is readable.",
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
      vehicleApprovals: {
        type: ["array", "null"],
        description:
          "Freigabe / Verwendungsbereich: vehicle MANUFACTURER + MODEL names only (e.g. 'Mazda RX-8', 'BMW 3er (E90)', 'VW Golf VII'). NEVER bare numbers, HSN/TSN, EG type codes alone, page numbers, or chassis-number fragments. Prefer 'Make Model' per entry. Null if none readable.",
        items: { type: "string" },
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

/** Freigabe entries must name a vehicle make/model — not bare codes/numbers. */
export function isPlausibleVehicleApproval(value: string): boolean {
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (
    trimmed.length < 3 ||
    trimmed.length > ABE_VEHICLE_APPROVAL_MAX_LENGTH
  ) {
    return false;
  }
  // Bare numbers / numeric codes (HSN, page, typ indices).
  if (/^\d{1,6}([./\-]\d{1,6})?$/.test(trimmed)) return false;
  if (/^(seite|page|nr\.?|hsn|tsn|eg|e\d)\b/i.test(trimmed)) return false;
  // Need real letters (manufacturer / model words), not only typ codes.
  if (!/[a-zäöüß]{2,}/i.test(trimmed)) return false;
  // Reject pure short alphanumeric type codes without a make word.
  if (/^[A-Z0-9][A-Z0-9.\-/]{1,10}$/.test(trimmed) && trimmed.length <= 8) {
    return false;
  }
  return true;
}

export function normalizeAbeVehicleApprovals(
  values: string[] | null | undefined,
): string[] | null {
  if (!values?.length) return null;
  const seen = new Set<string>();
  const cleaned: string[] = [];
  for (const raw of values) {
    const value = raw.trim().replace(/\s+/g, " ").slice(0, ABE_VEHICLE_APPROVAL_MAX_LENGTH);
    if (!isPlausibleVehicleApproval(value)) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    cleaned.push(value);
    if (cleaned.length >= ABE_VEHICLE_APPROVAL_MAX_ITEMS) break;
  }
  return cleaned.length > 0 ? cleaned : null;
}

function isValidIsoDateParts(year: number, month: number, day: number): boolean {
  if (!year || !month || !day) return false;
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  if (year < 1980 || year > 2100) return false;
  return true;
}

function toIsoDateString(year: number, month: number, day: number): string | null {
  if (!isValidIsoDateParts(year, month, day)) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Normalize printed dates (ISO or German DD.MM.YYYY) to YYYY-MM-DD or null. */
export function normalizeAbeDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();

  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return toIsoDateString(
      Number(isoMatch[1]),
      Number(isoMatch[2]),
      Number(isoMatch[3]),
    );
  }

  const germanMatch = trimmed.match(/^(\d{1,2})[./](\d{1,2})[./](\d{2,4})$/);
  if (germanMatch) {
    const day = Number(germanMatch[1]);
    const month = Number(germanMatch[2]);
    let year = Number(germanMatch[3]);
    if (year < 100) year += year >= 70 ? 1900 : 2000;
    return toIsoDateString(year, month, day);
  }

  return null;
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
    vehicleApprovals: normalizeAbeVehicleApprovals(fields.vehicleApprovals),
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
    vehicleApprovals: null,
  };
}
