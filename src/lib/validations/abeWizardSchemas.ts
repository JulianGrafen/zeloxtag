import { z } from "zod";

// ─── Vehicle match ─────────────────────────────────────────────────────────────

export const AbeVehicleMatchSchema = z
  .object({
    /** e.g. "BMW 5er Touring" */
    model: z.string().trim().min(1).max(200),
    /** e.g. "e1*2007/46*0508*..." */
    typeApproval: z.string().trim().min(1).max(300).nullable(),
    /** e.g. "Allradantrieb" or "Heckantrieb" */
    driveType: z.string().trim().min(1).max(100).nullable(),
    /** e.g. ["245/45R18", "255/45R18"] */
    tireSizes: z.array(z.string().trim().min(1).max(40)).max(20),
    /** e.g. ["10B", "11B", "BEN", "4DA", "245"] */
    auflagenCodes: z.array(z.string().trim().min(1).max(40)).max(60),
  })
  .strict();

export type AbeVehicleMatch = z.infer<typeof AbeVehicleMatchSchema>;

// ─── Step extractions ──────────────────────────────────────────────────────────

/**
 * Step 1 — Deckblatt (cover page).
 * Contains: KBA number, ABE/article number, design name, wheel dimensions, article codes.
 */
export const AbeWizardCoverSchema = z
  .object({
    /** e.g. "48185" (digits only, no "KBA" prefix) */
    kbaNumber: z.string().trim().min(1).max(32).nullable(),
    /** e.g. "AVAG9HA30" — the full ABE Rad-Gutachten number or first article */
    abeNumber: z.string().trim().min(1).max(80).nullable(),
    /** e.g. "Alcar Deutschland GmbH" — brand printed on Deckblatt */
    manufacturer: z.string().trim().min(1).max(200).nullable(),
    /** e.g. "Valencia / Valencia dark" */
    designType: z.string().trim().min(1).max(200).nullable(),
    /** e.g. "8J x 18H2 LK 5x120 ET 30" */
    dimensions: z.string().trim().min(1).max(200).nullable(),
    /** e.g. ["AVAG9HA30", "AVAG9BP30"] */
    articleNumbers: z.array(z.string().trim().min(1).max(80)).max(20),
  })
  .strict();

export type AbeWizardCoverExtraction = z.infer<typeof AbeWizardCoverSchema>;

/**
 * Step 2 — ABE Hauptseite (core certificate page).
 * Confirms and enriches ABE number, manufacturer, and testing organization.
 */
export const AbeWizardMainSchema = z
  .object({
    /** Official ABE number incl. suffix, e.g. "48185*08" */
    abeNumber: z.string().trim().min(1).max(80).nullable(),
    /** Inhaber der ABE, e.g. "Alcar Leichtmetallräder GmbH" */
    abeHolder: z.string().trim().min(1).max(200).nullable(),
    /** Hersteller on the certificate, e.g. "Alcar Leichtmetallräder GmbH" */
    manufacturer: z.string().trim().min(1).max(200).nullable(),
    /** Issuing authority, e.g. "Kraftfahrt-Bundesamt" */
    testingOrganization: z.string().trim().min(1).max(200).nullable(),
  })
  .strict();

export type AbeWizardMainExtraction = z.infer<typeof AbeWizardMainSchema>;

/**
 * Step 3 — Fahrzeug- & Auflagen-Tabelle (vehicle compatibility table).
 * One entry per vehicle model row with tyre sizes and Auflagen codes.
 */
export const AbeWizardVehiclesSchema = z
  .object({
    vehicleMatches: z.array(AbeVehicleMatchSchema).max(100),
  })
  .strict();

export type AbeWizardVehiclesExtraction = z.infer<
  typeof AbeWizardVehiclesSchema
>;

// ─── Merged report ─────────────────────────────────────────────────────────────

/**
 * Fully merged ABE wizard result — all three steps combined.
 * This is the object stored in `approval_fields.abeWizardReport`.
 */
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
          'KBA number digits only, e.g. "48185". Strip any "KBA" prefix. Null if not visible.',
      },
      abeNumber: {
        type: ["string", "null"],
        description:
          'The ABE Rad-Gutachten number printed on the cover, e.g. "AVAG9HA30". Null if absent.',
      },
      manufacturer: {
        type: ["string", "null"],
        description:
          'Brand or company printed on the cover, e.g. "Alcar Deutschland GmbH".',
      },
      designType: {
        type: ["string", "null"],
        description:
          'Design or model name, e.g. "Valencia / Valencia dark". Null if absent.',
      },
      dimensions: {
        type: ["string", "null"],
        description:
          'Full wheel dimension string, e.g. "8J x 18H2 LK 5x120 ET 30". Null if absent.',
      },
      articleNumbers: {
        type: "array",
        items: { type: "string" },
        description:
          'All article / part numbers listed (ZU RAD-ARTIKEL-NR.), e.g. ["AVAG9HA30", "AVAG9BP30"]. Empty array if none.',
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
          'Official ABE number with suffix if present, e.g. "48185*08". Null if not visible.',
      },
      abeHolder: {
        type: ["string", "null"],
        description:
          'Value next to "Inhaber der ABE" (or combined label). e.g. "Alcar Leichtmetallräder GmbH".',
      },
      manufacturer: {
        type: ["string", "null"],
        description:
          'Value next to "Hersteller" on this page. If only one combined label, same as abeHolder.',
      },
      testingOrganization: {
        type: ["string", "null"],
        description:
          'Issuing authority / Prüforganisation, e.g. "Kraftfahrt-Bundesamt" or "TÜV SÜD".',
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
          "Every vehicle model row from the Verwendungsbereich / compatibility table.",
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
                'Vehicle model name exactly as printed, e.g. "BMW 5er Touring".',
            },
            typeApproval: {
              type: ["string", "null"],
              description:
                'Type-approval number, e.g. "e1*2007/46*0508*...". Null if absent.',
            },
            driveType: {
              type: ["string", "null"],
              description:
                'Drive type, e.g. "Allradantrieb", "Heckantrieb", "Frontantrieb". Null if absent.',
            },
            tireSizes: {
              type: "array",
              items: { type: "string" },
              description:
                'All permitted tyre sizes for this row, e.g. ["245/45R18", "255/45R18"].',
            },
            auflagenCodes: {
              type: "array",
              items: { type: "string" },
              description:
                'All Auflagen / condition codes for this row, e.g. ["10B", "11B", "BEN", "4DA", "245"]. Include numeric codes too.',
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
 * Main page wins for `abeNumber`, `abeHolder`, and `manufacturer` when more specific.
 */
export function mergeAbeWizardSteps(
  cover: AbeWizardCoverExtraction,
  main: AbeWizardMainExtraction | null,
  vehicles: AbeWizardVehiclesExtraction | null,
): AbeWizardReport {
  // Main page typically has the full ABE number incl. suffix; prefer it.
  const abeNumber = main?.abeNumber ?? cover.abeNumber;
  const abeHolder =
    main?.abeHolder ?? main?.manufacturer ?? cover.manufacturer ?? null;
  // Cover brand name; main page Hersteller when present.
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
