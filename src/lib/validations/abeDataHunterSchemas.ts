import { z } from "zod";

import {
  ABE_MARKING_LLM_INSTRUCTION,
  ABE_MARKING_TEXT_MAX,
  mergeAbeMarkingText,
} from "@/lib/ocr/abe-marking-from-text";
import { AbeVehicleMatchSchema } from "@/lib/validations/abeWizardSchemas";

/** Prefix for OpenAI JSON schema field descriptions (legacy crop steps). */
const FROM_CROP =
  "Extract only from the attached cropped photograph. Copy verbatim. Null or empty if not visible. ";

/** Prefix for freestyle full-page photographs. */
const FROM_PHOTO =
  "Extract only from the attached photograph. Copy verbatim. Null or empty if not visible on this photo. ";

/**
 * Data-hunter steps map 1:1 to required ABE facts:
 * 1 stammdaten → KBA, Nummer der ABE, Inhaber, Hersteller, Bauteilbezeichnung
 * 2 marking    → Kennzeichnung (wo/wie KBA am Bauteil)
 * 3 vehicle    → Verkaufsbezeichnung / Fahrzeugfreigabe
 * 4 auflagen   → Auflagen-Kürzel zum gewählten Fahrzeug
 */
export const ABE_DATA_HUNTER_STEPS = [
  "stammdaten",
  "marking",
  "vehicle",
  "auflagen",
] as const;

export type AbeDataHunterStep = (typeof ABE_DATA_HUNTER_STEPS)[number];

/** Required core fields that must be present before save. */
export const ABE_REQUIRED_FIELD_LABELS = {
  kbaNumber: "KBA-Nummer",
  abeNumber: "Nummer der ABE",
  abeHolder: "Inhaber der ABE",
  manufacturer: "Hersteller",
  partDesignation: "Bezeichnung des Bauteils",
  markingText: "Kennzeichnung",
  verkaufsbezeichnung: "Verkaufsbezeichnung (Fahrzeugfreigabe)",
  auflagenCodes: "Auflagen zum Fahrzeug",
} as const;

export type AbeRequiredFieldKey = keyof typeof ABE_REQUIRED_FIELD_LABELS;

// ─── Step extractions ───────────────────────────────────────────────────────────

export const AbeHuntStammdatenSchema = z
  .object({
    kbaNumber: z.string().trim().min(1).max(32).nullable(),
    abeNumber: z.string().trim().min(1).max(80).nullable(),
    abeHolder: z.string().trim().min(1).max(200).nullable(),
    manufacturer: z.string().trim().min(1).max(200).nullable(),
    partDesignation: z.string().trim().min(1).max(200).nullable(),
  })
  .strict();

export type AbeHuntStammdatenExtraction = z.infer<
  typeof AbeHuntStammdatenSchema
>;

/** @deprecated Use AbeHuntStammdatenExtraction */
export type AbeHuntKbaExtraction = AbeHuntStammdatenExtraction;

export const AbeHuntMarkingSchema = z
  .object({
    /** How/where the KBA number is marked on the physical part. */
    markingText: z.string().trim().min(1).max(ABE_MARKING_TEXT_MAX).nullable(),
  })
  .strict();

export type AbeHuntMarkingExtraction = z.infer<typeof AbeHuntMarkingSchema>;

export const AbeHuntVehicleSchema = z
  .object({
    vehicleMatches: z.array(AbeVehicleMatchSchema).max(100),
  })
  .strict();

export type AbeHuntVehicleExtraction = z.infer<typeof AbeHuntVehicleSchema>;

export const AbeHuntAuflagenSchema = z
  .object({
    auflagenCodes: z.array(z.string().trim().min(1).max(40)).max(80),
    auflagenNotes: z.string().trim().min(1).max(1_200).nullable(),
  })
  .strict();

export type AbeHuntAuflagenExtraction = z.infer<typeof AbeHuntAuflagenSchema>;

/** Merged report after all hunt steps (manual overrides applied). */
export const AbeDataHunterReportSchema = z
  .object({
    kbaNumber: z.string().trim().min(1).max(32).nullable(),
    abeNumber: z.string().trim().min(1).max(80).nullable(),
    abeHolder: z.string().trim().min(1).max(200).nullable(),
    manufacturer: z.string().trim().min(1).max(200).nullable(),
    partDesignation: z.string().trim().min(1).max(200).nullable(),
    markingText: z.string().trim().min(1).max(ABE_MARKING_TEXT_MAX).nullable(),
    vehicleMatches: z.array(AbeVehicleMatchSchema).max(100),
    auflagenCodes: z.array(z.string().trim().min(1).max(40)).max(80),
    auflagenNotes: z.string().trim().min(1).max(1_200).nullable(),
  })
  .strict();

export type AbeDataHunterReport = z.infer<typeof AbeDataHunterReportSchema>;

export type AbeHuntExtractionStatus = "ok" | "needs_manual";

export type AbeHuntStepResult<T> = {
  status: AbeHuntExtractionStatus;
  extraction: T;
  reason?: string;
};

// ─── Completeness checks (HITL triggers) ───────────────────────────────────────

export function isAbeHuntStammdatenComplete(
  data: AbeHuntStammdatenExtraction,
): boolean {
  return Boolean(
    data.kbaNumber?.trim() &&
      data.abeNumber?.trim() &&
      data.abeHolder?.trim() &&
      data.manufacturer?.trim() &&
      data.partDesignation?.trim(),
  );
}

/** @deprecated Use isAbeHuntStammdatenComplete */
export const isAbeHuntKbaComplete = isAbeHuntStammdatenComplete;

export function isAbeHuntMarkingComplete(
  data: AbeHuntMarkingExtraction,
): boolean {
  return Boolean(data.markingText?.trim());
}

export function isAbeHuntVehicleComplete(
  data: AbeHuntVehicleExtraction,
): boolean {
  return data.vehicleMatches.some((row) =>
    Boolean(row.verkaufsbezeichnung?.trim()),
  );
}

export function isAbeHuntAuflagenComplete(
  data: AbeHuntAuflagenExtraction,
): boolean {
  return data.auflagenCodes.length > 0;
}

export function mergeAbeDataHunterSteps(
  stammdaten: AbeHuntStammdatenExtraction,
  marking: AbeHuntMarkingExtraction,
  vehicle: AbeHuntVehicleExtraction,
  auflagen: AbeHuntAuflagenExtraction,
): AbeDataHunterReport {
  return {
    kbaNumber: stammdaten.kbaNumber,
    abeNumber: stammdaten.abeNumber,
    abeHolder: stammdaten.abeHolder,
    manufacturer: stammdaten.manufacturer,
    partDesignation: stammdaten.partDesignation,
    markingText: marking.markingText,
    vehicleMatches: vehicle.vehicleMatches,
    auflagenCodes: auflagen.auflagenCodes,
    auflagenNotes: auflagen.auflagenNotes,
  };
}

function keepFilled(
  current: string | null | undefined,
  incoming: string | null | undefined,
): string | null {
  const cur = current?.trim();
  if (cur) return cur;
  const next = incoming?.trim();
  return next || null;
}

function mergeUniqueCodes(a: string[], b: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const code of [...a, ...b]) {
    const trimmed = code.trim();
    if (!trimmed) continue;
    const key = trimmed.toUpperCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

function vehicleRowKey(row: {
  verkaufsbezeichnung: string;
  fahrzeugtyp: string | null;
  typeApproval: string | null;
}): string {
  return [
    row.verkaufsbezeichnung.trim().toUpperCase(),
    (row.fahrzeugtyp ?? "").trim().toUpperCase(),
    (row.typeApproval ?? "").trim().toUpperCase(),
  ].join("|");
}

/**
 * Merge a new photo/PDF extraction into the accumulating report.
 * Already-filled scalar fields win; vehicle rows and Auflagen codes accumulate.
 */
export function fillAbeDataHunterReport(
  current: AbeDataHunterReport,
  incoming: AbeDataHunterReport,
): AbeDataHunterReport {
  const seenRows = new Set(current.vehicleMatches.map(vehicleRowKey));
  const vehicleMatches = [...current.vehicleMatches];
  for (const row of incoming.vehicleMatches) {
    const key = vehicleRowKey(row);
    if (seenRows.has(key)) continue;
    seenRows.add(key);
    vehicleMatches.push(row);
  }

  return {
    kbaNumber: keepFilled(current.kbaNumber, incoming.kbaNumber),
    abeNumber: keepFilled(current.abeNumber, incoming.abeNumber),
    abeHolder: keepFilled(current.abeHolder, incoming.abeHolder),
    manufacturer: keepFilled(current.manufacturer, incoming.manufacturer),
    partDesignation: keepFilled(
      current.partDesignation,
      incoming.partDesignation,
    ),
    markingText: mergeAbeMarkingText(
      current.markingText,
      incoming.markingText,
    ),
    vehicleMatches,
    auflagenCodes: mergeUniqueCodes(
      current.auflagenCodes,
      incoming.auflagenCodes,
    ),
    auflagenNotes: keepFilled(current.auflagenNotes, incoming.auflagenNotes),
  };
}

export function emptyAbeDataHunterReport(): AbeDataHunterReport {
  return {
    kbaNumber: null,
    abeNumber: null,
    abeHolder: null,
    manufacturer: null,
    partDesignation: null,
    markingText: null,
    vehicleMatches: [],
    auflagenCodes: [],
    auflagenNotes: null,
  };
}

/**
 * Returns human-readable labels of required fields that are still missing.
 * `verkaufsbezeichnung` is checked via the selected group / first match.
 */
export function missingAbeRequiredFields(
  report: AbeDataHunterReport,
  selectedVerkaufsbezeichnung?: string | null,
): AbeRequiredFieldKey[] {
  const missing: AbeRequiredFieldKey[] = [];
  if (!report.kbaNumber?.trim()) missing.push("kbaNumber");
  if (!report.abeNumber?.trim()) missing.push("abeNumber");
  if (!report.abeHolder?.trim()) missing.push("abeHolder");
  if (!report.manufacturer?.trim()) missing.push("manufacturer");
  if (!report.partDesignation?.trim()) missing.push("partDesignation");
  if (!report.markingText?.trim()) missing.push("markingText");

  const verkaufsbezeichnung =
    selectedVerkaufsbezeichnung?.trim() ||
    report.vehicleMatches.find((row) => row.verkaufsbezeichnung?.trim())
      ?.verkaufsbezeichnung;
  if (!verkaufsbezeichnung?.trim()) missing.push("verkaufsbezeichnung");

  if (report.auflagenCodes.length === 0) missing.push("auflagenCodes");

  return missing;
}

export function isAbeDataHunterReportComplete(
  report: AbeDataHunterReport,
  selectedVerkaufsbezeichnung?: string | null,
): boolean {
  return missingAbeRequiredFields(report, selectedVerkaufsbezeichnung).length === 0;
}

// ─── OpenAI JSON Schemas ───────────────────────────────────────────────────────

export const ABE_HUNT_STAMMDATEN_JSON_SCHEMA = {
  name: "abe_hunt_stammdaten",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "kbaNumber",
      "abeNumber",
      "abeHolder",
      "manufacturer",
      "partDesignation",
    ],
    properties: {
      kbaNumber: {
        type: ["string", "null"],
        description:
          FROM_CROP +
          'KBA number digits only. Strip any "KBA" prefix. Null if not visible.',
      },
      abeNumber: {
        type: ["string", "null"],
        description:
          FROM_CROP +
          'Nummer der ABE next to "Nummer der ABE:" including any *suffix.',
      },
      abeHolder: {
        type: ["string", "null"],
        description:
          FROM_CROP +
          'Inhaber der ABE. If combined "Inhaber der ABE und Hersteller", put the same company in both fields.',
      },
      manufacturer: {
        type: ["string", "null"],
        description:
          FROM_CROP +
          "Hersteller. If only a combined holder/manufacturer label exists, copy that value here too.",
      },
      partDesignation: {
        type: ["string", "null"],
        description:
          FROM_CROP +
          "Bezeichnung des Bauteils (Gerät, Typ, Design, Spoiler, Spurverbreiterung, Radtyp, etc.).",
      },
    },
  },
} as const;

/** @deprecated Use ABE_HUNT_STAMMDATEN_JSON_SCHEMA */
export const ABE_HUNT_KBA_JSON_SCHEMA = ABE_HUNT_STAMMDATEN_JSON_SCHEMA;

export const ABE_HUNT_MARKING_JSON_SCHEMA = {
  name: "abe_hunt_marking",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["markingText"],
    properties: {
      markingText: {
        type: ["string", "null"],
        description: FROM_CROP + ABE_MARKING_LLM_INSTRUCTION,
      },
    },
  },
} as const;

export const ABE_HUNT_VEHICLE_JSON_SCHEMA = {
  name: "abe_hunt_vehicle",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["vehicleMatches"],
    properties: {
      vehicleMatches: {
        type: "array",
        description:
          FROM_CROP +
          "One entry per visible table row for the Verkaufsbezeichnung / vehicle approval section.",
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "verkaufsbezeichnung",
            "fahrzeugtyp",
            "typeApproval",
            "driveType",
            "tireSizes",
            "auflagenCodes",
          ],
          properties: {
            verkaufsbezeichnung: {
              type: "string",
              description:
                FROM_CROP +
                "Verkaufsbezeichnung / model section header for this row group.",
            },
            fahrzeugtyp: {
              type: ["string", "null"],
              description: FROM_CROP + "Fahrzeugtyp cell.",
            },
            typeApproval: {
              type: ["string", "null"],
              description:
                FROM_CROP + "Betriebserlaubnis / Typgenehmigung cell.",
            },
            driveType: {
              type: ["string", "null"],
              description:
                FROM_CROP +
                "Allradantrieb / Heckantrieb / Frontantrieb if present.",
            },
            tireSizes: {
              type: "array",
              items: { type: "string" },
              description:
                FROM_CROP + "Tyre sizes if present; empty array otherwise.",
            },
            auflagenCodes: {
              type: "array",
              items: { type: "string" },
              description:
                FROM_CROP +
                "Short Auflagen codes on this row only (may be empty).",
            },
          },
        },
      },
    },
  },
} as const;

export const ABE_HUNT_AUFLAGEN_JSON_SCHEMA = {
  name: "abe_hunt_auflagen",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["auflagenCodes", "auflagenNotes"],
    properties: {
      auflagenCodes: {
        type: "array",
        items: { type: "string" },
        description:
          FROM_CROP +
          "Short Auflagen-Kürzel that apply to the selected vehicle (e.g. 744, A77, 12A).",
      },
      auflagenNotes: {
        type: ["string", "null"],
        description:
          FROM_CROP +
          "Optional free-text notes next to the codes. Null if none.",
      },
    },
  },
} as const;

/**
 * Single-shot freestyle extraction: pull every visible required ABE fact
 * from one full photograph (no crop steps).
 */
export const ABE_HUNT_ALL_JSON_SCHEMA = {
  name: "abe_hunt_all",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "kbaNumber",
      "abeNumber",
      "abeHolder",
      "manufacturer",
      "partDesignation",
      "markingText",
      "vehicleMatches",
      "auflagenCodes",
      "auflagenNotes",
    ],
    properties: {
      kbaNumber: {
        type: ["string", "null"],
        description:
          FROM_PHOTO +
          'KBA number digits only. Strip any "KBA" prefix. Null if not visible.',
      },
      abeNumber: {
        type: ["string", "null"],
        description:
          FROM_PHOTO +
          'Nummer der ABE next to "Nummer der ABE:" including any *suffix.',
      },
      abeHolder: {
        type: ["string", "null"],
        description:
          FROM_PHOTO +
          'Inhaber der ABE. If combined "Inhaber der ABE und Hersteller", put the same company in both fields.',
      },
      manufacturer: {
        type: ["string", "null"],
        description:
          FROM_PHOTO +
          "Hersteller. If only a combined holder/manufacturer label exists, copy that value here too.",
      },
      partDesignation: {
        type: ["string", "null"],
        description:
          FROM_PHOTO +
          "Bezeichnung des Bauteils (Gerät, Typ, Design, Spoiler, Spurverbreiterung, Radtyp, etc.).",
      },
      markingText: {
        type: ["string", "null"],
        description: FROM_PHOTO + ABE_MARKING_LLM_INSTRUCTION,
      },
      vehicleMatches: {
        type: "array",
        description:
          FROM_PHOTO +
          "One entry per visible table row for the Verkaufsbezeichnung / vehicle approval section. Empty if no table is visible.",
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "verkaufsbezeichnung",
            "fahrzeugtyp",
            "typeApproval",
            "driveType",
            "tireSizes",
            "auflagenCodes",
          ],
          properties: {
            verkaufsbezeichnung: {
              type: "string",
              description:
                FROM_PHOTO +
                "Verkaufsbezeichnung / model section header for this row group.",
            },
            fahrzeugtyp: {
              type: ["string", "null"],
              description: FROM_PHOTO + "Fahrzeugtyp cell.",
            },
            typeApproval: {
              type: ["string", "null"],
              description:
                FROM_PHOTO + "Betriebserlaubnis / Typgenehmigung cell.",
            },
            driveType: {
              type: ["string", "null"],
              description:
                FROM_PHOTO +
                "Allradantrieb / Heckantrieb / Frontantrieb if present.",
            },
            tireSizes: {
              type: "array",
              items: { type: "string" },
              description:
                FROM_PHOTO + "Tyre sizes if present; empty array otherwise.",
            },
            auflagenCodes: {
              type: "array",
              items: { type: "string" },
              description:
                FROM_PHOTO +
                "Short Auflagen codes on this row only (may be empty).",
            },
          },
        },
      },
      auflagenCodes: {
        type: "array",
        items: { type: "string" },
        description:
          FROM_PHOTO +
          "Short Auflagen-Kürzel visible on this photo (e.g. 744, A77, 12A). Empty if none.",
      },
      auflagenNotes: {
        type: ["string", "null"],
        description:
          FROM_PHOTO +
          "Optional free-text notes next to the codes. Null if none.",
      },
    },
  },
} as const;
