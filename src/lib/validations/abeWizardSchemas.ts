import { z } from "zod";

/** Prefix for OpenAI JSON schema field descriptions — reduces example hallucination. */
const FROM_DOCUMENT =
  "Extract only from the attached document. Copy verbatim. Null or empty if not visible. ";

// ─── Vehicle match ─────────────────────────────────────────────────────────────

export const AbeVehicleMatchSchema = z
  .object({
    /** Verkaufsbezeichnung / model group label from the table row */
    model: z.string().trim().min(1).max(200),
    /** Betriebserlaubnis / type-approval cell */
    typeApproval: z.string().trim().min(1).max(300).nullable(),
    /** Drive type from Auflagen column when present */
    driveType: z.string().trim().min(1).max(100).nullable(),
    /** Reifen column values for this row */
    tireSizes: z.array(z.string().trim().min(1).max(40)).max(20),
    /** Auflagen / condition codes for this row */
    auflagenCodes: z.array(z.string().trim().min(1).max(40)).max(60),
  })
  .strict();

export type AbeVehicleMatch = z.infer<typeof AbeVehicleMatchSchema>;

// ─── Step extractions ──────────────────────────────────────────────────────────

/** Step 1 — Deckblatt (cover page). */
export const AbeWizardCoverSchema = z
  .object({
    kbaNumber: z.string().trim().min(1).max(32).nullable(),
    abeNumber: z.string().trim().min(1).max(80).nullable(),
    manufacturer: z.string().trim().min(1).max(200).nullable(),
    designType: z.string().trim().min(1).max(200).nullable(),
    dimensions: z.string().trim().min(1).max(200).nullable(),
    articleNumbers: z.array(z.string().trim().min(1).max(80)).max(20),
  })
  .strict();

export type AbeWizardCoverExtraction = z.infer<typeof AbeWizardCoverSchema>;

/** Step 2 — ABE Hauptseite (core certificate page). */
export const AbeWizardMainSchema = z
  .object({
    abeNumber: z.string().trim().min(1).max(80).nullable(),
    abeHolder: z.string().trim().min(1).max(200).nullable(),
    manufacturer: z.string().trim().min(1).max(200).nullable(),
    testingOrganization: z.string().trim().min(1).max(200).nullable(),
  })
  .strict();

export type AbeWizardMainExtraction = z.infer<typeof AbeWizardMainSchema>;

/** Step 3 — Fahrzeug- & Auflagen-Tabelle. */
export const AbeWizardVehiclesSchema = z
  .object({
    vehicleMatches: z.array(AbeVehicleMatchSchema).max(100),
  })
  .strict();

export type AbeWizardVehiclesExtraction = z.infer<
  typeof AbeWizardVehiclesSchema
>;

// ─── Merged report ─────────────────────────────────────────────────────────────

export const AbeWizardReportSchema = z
  .object({
    kbaNumber: z.string().trim().min(1).max(32).nullable(),
    abeNumber: z.string().trim().min(1).max(80).nullable(),
    abeHolder: z.string().trim().min(1).max(200).nullable(),
    manufacturer: z.string().trim().min(1).max(200).nullable(),
    testingOrganization: z.string().trim().min(1).max(200).nullable(),
    designType: z.string().trim().min(1).max(200).nullable(),
    dimensions: z.string().trim().min(1).max(200).nullable(),
    articleNumbers: z.array(z.string().trim().min(1).max(80)).max(20),
    vehicleMatches: z.array(AbeVehicleMatchSchema).max(100),
  })
  .strict();

export type AbeWizardReport = z.infer<typeof AbeWizardReportSchema>;

// ─── OpenAI JSON Schemas ───────────────────────────────────────────────────────

export const ABE_WIZARD_COVER_JSON_SCHEMA = {
  name: "abe_wizard_cover",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "kbaNumber",
      "abeNumber",
      "manufacturer",
      "designType",
      "dimensions",
      "articleNumbers",
    ],
    properties: {
      kbaNumber: {
        type: ["string", "null"],
        description:
          FROM_DOCUMENT +
          'KBA number digits only. Strip any "KBA" prefix.',
      },
      abeNumber: {
        type: ["string", "null"],
        description:
          FROM_DOCUMENT + "ABE / Rad-Gutachten number printed on the cover.",
      },
      manufacturer: {
        type: ["string", "null"],
        description:
          FROM_DOCUMENT + "Manufacturer or brand name printed on the cover.",
      },
      designType: {
        type: ["string", "null"],
        description:
          FROM_DOCUMENT +
          "Design / model name from the DESIGN field. Join multiple lines with ' / '.",
      },
      dimensions: {
        type: ["string", "null"],
        description:
          FROM_DOCUMENT + "Wheel dimensions from the GRÖSSE field.",
      },
      articleNumbers: {
        type: "array",
        items: { type: "string" },
        description:
          FROM_DOCUMENT +
          "All article numbers from ZU RAD-ARTIKEL-NR. Empty array if none.",
      },
    },
  },
} as const;

export const ABE_WIZARD_MAIN_JSON_SCHEMA = {
  name: "abe_wizard_main",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["abeNumber", "abeHolder", "manufacturer", "testingOrganization"],
    properties: {
      abeNumber: {
        type: ["string", "null"],
        description:
          FROM_DOCUMENT +
          'Value next to "Nummer der ABE:" including any suffix after *.',
      },
      abeHolder: {
        type: ["string", "null"],
        description:
          FROM_DOCUMENT +
          'Value next to "Inhaber der ABE" or combined holder/manufacturer label.',
      },
      manufacturer: {
        type: ["string", "null"],
        description:
          FROM_DOCUMENT +
          'Value next to "Hersteller:" when shown separately.',
      },
      testingOrganization: {
        type: ["string", "null"],
        description:
          FROM_DOCUMENT + "Issuing authority / Prüforganisation on this page.",
      },
    },
  },
} as const;

export const ABE_WIZARD_VEHICLES_JSON_SCHEMA = {
  name: "abe_wizard_vehicles",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["vehicleMatches"],
    properties: {
      vehicleMatches: {
        type: "array",
        description:
          FROM_DOCUMENT +
          "One entry per visible table row. Empty array if no table is visible.",
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "model",
            "typeApproval",
            "driveType",
            "tireSizes",
            "auflagenCodes",
          ],
          properties: {
            model: {
              type: "string",
              description:
                FROM_DOCUMENT +
                "Verkaufsbezeichnung group label for this row, verbatim.",
            },
            typeApproval: {
              type: ["string", "null"],
              description:
                FROM_DOCUMENT + "Betriebserlaubnis cell for this row.",
            },
            driveType: {
              type: ["string", "null"],
              description:
                FROM_DOCUMENT +
                "First drive-type word in Auflagen column (Allradantrieb / Heckantrieb / Frontantrieb).",
            },
            tireSizes: {
              type: "array",
              items: { type: "string" },
              description:
                FROM_DOCUMENT +
                "All tyre sizes from Reifen column for this row.",
            },
            auflagenCodes: {
              type: "array",
              items: { type: "string" },
              description:
                FROM_DOCUMENT +
                "All condition codes and short notes from Auflagen column for this row.",
            },
          },
        },
      },
    },
  },
} as const;

// ─── Merge helper ─────────────────────────────────────────────────────────────

/**
 * Merge the three step extractions into a single `AbeWizardReport`.
 * No defaults — only combines what was extracted from each step.
 */
export function mergeAbeWizardSteps(
  cover: AbeWizardCoverExtraction,
  main: AbeWizardMainExtraction | null,
  vehicles: AbeWizardVehiclesExtraction | null,
): AbeWizardReport {
  const abeNumber = main?.abeNumber ?? cover.abeNumber;
  const abeHolder =
    main?.abeHolder ?? main?.manufacturer ?? cover.manufacturer ?? null;
  const manufacturer =
    cover.manufacturer ?? main?.manufacturer ?? main?.abeHolder ?? null;

  return {
    kbaNumber: cover.kbaNumber,
    abeNumber,
    abeHolder,
    manufacturer,
    testingOrganization: main?.testingOrganization ?? null,
    designType: cover.designType,
    dimensions: cover.dimensions,
    articleNumbers: cover.articleNumbers,
    vehicleMatches: vehicles?.vehicleMatches ?? [],
  };
}
