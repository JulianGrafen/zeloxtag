import { z } from "zod";

/**
 * Minimal ABE fields for dashboard summary + optional per-vehicle match.
 * Full compatibility tables stay in the PDF — we only verify the user's car.
 */

export const ABE_USER_VEHICLE_MATCH_STATUSES = [
  "verified",
  "not_found",
  "needs_manual_check",
] as const;

export type AbeUserVehicleMatchStatus =
  (typeof ABE_USER_VEHICLE_MATCH_STATUSES)[number];

/** Optional garage vehicle injected into ABE OCR parse. */
export const AbeVehicleContextSchema = z
  .object({
    brand: z.string().trim().min(1).max(80),
    model: z.string().trim().min(1).max(120),
    type: z.string().trim().min(1).max(80).optional(),
    egBe: z.string().trim().min(1).max(160).optional(),
  })
  .strict();

export type AbeVehicleContext = z.infer<typeof AbeVehicleContextSchema>;

/** Single Verwendungsbereich / compatibility-table row. */
export const TableRowSchema = z
  .object({
    id: z.string().trim().min(1).max(80),
    cells: z.array(z.string().trim().max(500)).max(24),
    /** True when this row matches the user's garage vehicle. */
    isUserVehicleMatch: z.boolean(),
    /** Human-readable reason, e.g. "Matched by Type 3C and EG-BE …". */
    matchReason: z.string().trim().min(1).max(300).nullable().optional(),
  })
  .strict();

export type TableRow = z.infer<typeof TableRowSchema>;

/** Structured compatibility table (headers + body rows). */
export const TableDataSchema = z
  .object({
    headers: z.array(z.string().trim().max(120)).min(1).max(24),
    rows: z.array(TableRowSchema).max(500),
    caption: z.string().trim().min(1).max(200).nullable().optional(),
  })
  .strict();

export type TableData = z.infer<typeof TableDataSchema>;

/** OpenAI / JSON Schema fragment for table extraction (match flags default false). */
export const TABLE_DATA_JSON_SCHEMA = {
  name: "abe_compatibility_table",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["headers", "rows", "caption"],
    properties: {
      headers: {
        type: "array",
        items: { type: "string" },
        description: "Column headers from the Verwendungsbereich table.",
      },
      rows: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["id", "cells", "isUserVehicleMatch", "matchReason"],
          properties: {
            id: {
              type: "string",
              description: "Stable row id (e.g. row-1).",
            },
            cells: {
              type: "array",
              items: { type: "string" },
              description: "Cell values aligned to headers.",
            },
            isUserVehicleMatch: {
              type: "boolean",
              description:
                "Always false at extract time; TableMatchingService sets the flag.",
            },
            matchReason: {
              type: ["string", "null"],
              description: "Null at extract time; filled by matching service.",
            },
          },
        },
      },
      caption: {
        type: ["string", "null"],
        description: 'Optional caption, e.g. "Verwendungsbereich".',
      },
    },
  },
} as const;

export const AbeMinimalSchema = z
  .object({
    /** Digits only (e.g. "39577"), not "KBA 39577". */
    kbaNumber: z.string().trim().min(1).max(32).nullable(),
    /** Prüforganisation / issuer (e.g. "TÜV SÜD Automotive GmbH"). */
    testingOrganization: z.string().trim().min(1).max(200).nullable(),
    /** Part manufacturer / Herstellerzeichen (e.g. "MS Design"). */
    manufacturer: z.string().trim().min(1).max(120).nullable(),
    /** Free-text part family (e.g. "Frontspoiler", "Tieferlegungsfedern"). */
    partCategory: z.string().trim().min(1).max(120).nullable(),
    /** Exact part model / type id (e.g. "3C5 071 609"). */
    partType: z.string().trim().min(1).max(160).nullable(),
    /**
     * Compatibility vs the user's garage vehicle.
     * Null when no vehicleContext was provided (check skipped).
     */
    userVehicleMatchStatus: z
      .enum(ABE_USER_VEHICLE_MATCH_STATUSES)
      .nullable(),
    /** Auflagen / conditions that apply only to the matched vehicle row. */
    matchedConditions: z
      .array(z.string().trim().min(1).max(800))
      .max(40)
      .nullable(),
    /** Exact Verwendungsbereich row found for the user's car. */
    matchedVehicleRow: z.string().trim().min(1).max(500).nullable(),
    /** Structured Verwendungsbereich table when extracted. */
    compatibilityTable: TableDataSchema.nullable().optional(),
  })
  .strict();

export type AbeMinimal = z.infer<typeof AbeMinimalSchema>;

/** OpenAI strict JSON Schema — keep in sync with {@link AbeMinimalSchema}. */
export const ABE_MINIMAL_JSON_SCHEMA = {
  name: "abe_minimal",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "kbaNumber",
      "testingOrganization",
      "manufacturer",
      "partCategory",
      "partType",
      "userVehicleMatchStatus",
      "matchedConditions",
      "matchedVehicleRow",
      "compatibilityTable",
    ],
    properties: {
      kbaNumber: {
        type: ["string", "null"],
        description: 'KBA number digits only, e.g. "39577". No "KBA" prefix.',
      },
      testingOrganization: {
        type: ["string", "null"],
        description:
          'Testing organization / issuer, e.g. "TÜV SÜD Automotive GmbH".',
      },
      manufacturer: {
        type: ["string", "null"],
        description: 'Part manufacturer / mark, e.g. "MS Design".',
      },
      partCategory: {
        type: ["string", "null"],
        description:
          'Part category in German, e.g. "Frontspoiler", "Tieferlegungsfedern".',
      },
      partType: {
        type: ["string", "null"],
        description: 'Exact part model / type id, e.g. "3C5 071 609".',
      },
      userVehicleMatchStatus: {
        type: ["string", "null"],
        enum: [...ABE_USER_VEHICLE_MATCH_STATUSES, null],
        description:
          "verified | not_found | needs_manual_check for the TARGET vehicle. Null if no target vehicle was provided.",
      },
      matchedConditions: {
        type: ["array", "null"],
        description:
          "Conditions/Auflagen that apply ONLY to the matched vehicle row. Null if none or not verified.",
        items: { type: "string" },
      },
      matchedVehicleRow: {
        type: ["string", "null"],
        description:
          "Exact Verwendungsbereich row text for the user's vehicle. Null if not verified.",
      },
      compatibilityTable: {
        ...TABLE_DATA_JSON_SCHEMA.schema,
        type: ["object", "null"],
        description:
          "Structured Verwendungsbereich table when readable; otherwise null. Match flags are applied server-side.",
      },
    },
  },
} as const;

/** Normalize KBA to digits-only (strip "KBA", spaces, punctuation). */
export function normalizeAbeKbaDigits(
  value: string | null | undefined,
): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  if (digits.length < 3 || digits.length > 12) {
    const trimmed = value.trim().slice(0, 32);
    return trimmed.length > 0 ? trimmed : null;
  }
  return digits;
}

function normalizeMatchedConditions(
  values: string[] | null | undefined,
): string[] | null {
  if (!values?.length) return null;
  const cleaned = values
    .map((value) => value.trim().replace(/\s+/g, " ").slice(0, 800))
    .filter(Boolean)
    .slice(0, 40);
  return cleaned.length > 0 ? cleaned : null;
}

function normalizeCompatibilityTable(
  table: TableData | null | undefined,
): TableData | null {
  if (!table) return null;
  const parsed = TableDataSchema.safeParse({
    headers: table.headers.map((header) => header.trim().slice(0, 120)),
    rows: table.rows.map((row) => ({
      id: row.id.trim().slice(0, 80),
      cells: row.cells.map((cell) => cell.trim().slice(0, 500)),
      isUserVehicleMatch: Boolean(row.isUserVehicleMatch),
      matchReason: row.matchReason?.trim().slice(0, 300) || null,
    })),
    caption: table.caption?.trim().slice(0, 200) || null,
  });
  return parsed.success ? parsed.data : null;
}

export function normalizeAbeMinimal(fields: AbeMinimal): AbeMinimal {
  const status = fields.userVehicleMatchStatus;
  const verified = status === "verified";

  return {
    kbaNumber: normalizeAbeKbaDigits(fields.kbaNumber),
    testingOrganization:
      fields.testingOrganization?.trim().slice(0, 200) || null,
    manufacturer: fields.manufacturer?.trim().slice(0, 120) || null,
    partCategory: fields.partCategory?.trim().slice(0, 120) || null,
    partType: fields.partType?.trim().slice(0, 160) || null,
    userVehicleMatchStatus: status ?? null,
    matchedConditions: verified
      ? normalizeMatchedConditions(fields.matchedConditions)
      : null,
    matchedVehicleRow: verified
      ? fields.matchedVehicleRow?.trim().slice(0, 500) || null
      : null,
    compatibilityTable: normalizeCompatibilityTable(fields.compatibilityTable),
  };
}

export function emptyAbeMinimal(): AbeMinimal {
  return {
    kbaNumber: null,
    testingOrganization: null,
    manufacturer: null,
    partCategory: null,
    partType: null,
    userVehicleMatchStatus: null,
    matchedConditions: null,
    matchedVehicleRow: null,
    compatibilityTable: null,
  };
}

/** Display helper: "KBA 39577" when digits are present. */
export function formatAbeKbaDisplay(
  kbaNumber: string | null | undefined,
): string | null {
  const digits = normalizeAbeKbaDigits(kbaNumber);
  if (!digits) return null;
  if (/^\d+$/.test(digits)) return `KBA ${digits}`;
  return digits;
}

export function formatAbeVehicleContextLabel(
  context: AbeVehicleContext,
): string {
  const parts = [context.brand, context.model];
  if (context.type) parts.push(`(${context.type})`);
  return parts.join(" ").replace(/\s+/g, " ").trim();
}
