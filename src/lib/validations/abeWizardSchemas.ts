import { z } from "zod";

import { ABE_AUFLAGEN_COLUMN_LLM_HINT } from "@/lib/ocr/abe-auflagen-kuerzel-hints";

/** Prefix for OpenAI JSON schema field descriptions — reduces example hallucination. */
const FROM_DOCUMENT =
  "Extract only from the attached document. Copy verbatim. Null or empty if not visible. ";

// ─── Vehicle match ─────────────────────────────────────────────────────────────

export const AbeVehicleMatchSchema = z
  .object({
    verkaufsbezeichnung: z.string().trim().min(1).max(200),
    fahrzeugtyp: z.string().trim().max(40).nullable(),
    typeApproval: z.string().trim().max(300).nullable(),
    driveType: z.string().trim().max(100).nullable(),
    tireSizes: z.array(z.string().trim().max(40)).max(20),
    auflagenCodes: z.array(z.string().trim().max(40)).max(60),
  })
  .strict();

export type AbeVehicleMatch = z.infer<typeof AbeVehicleMatchSchema>;

// ─── Step extractions ──────────────────────────────────────────────────────────

/** Step 1 — Deckblatt (cover page). */
export const AbeWizardCoverSchema = z
  .object({
    kbaNumber: z.string().trim().min(1).max(32).nullable(),
    /** Genehmigungsnummer / Gutachten-Nr. from the manufacturer cover page. */
    approvalNumber: z.string().trim().min(1).max(80).nullable(),
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

/** Step 3 — Fahrzeug- & Auflagen-Tabelle (raw LLM payload before normalization). */
export const AbeWizardVehiclesSchema = z
  .object({
    vehicleMatches: z.array(z.unknown()).max(100),
  })
  .strict();

export type AbeWizardVehiclesRaw = z.infer<typeof AbeWizardVehiclesSchema>;

export type AbeWizardVehiclesExtraction = {
  vehicleMatches: AbeVehicleMatch[];
};

// ─── Merged report ─────────────────────────────────────────────────────────────

export const AbeWizardReportSchema = z
  .object({
    kbaNumber: z.string().trim().min(1).max(32).nullable(),
    approvalNumber: z.string().trim().min(1).max(80).nullable(),
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
      "approvalNumber",
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
          'KBA number digits only when a KBA field is visible. Strip any "KBA" prefix. Null if no KBA is printed on this page.',
      },
      approvalNumber: {
        type: ["string", "null"],
        description:
          FROM_DOCUMENT +
          "Genehmigungsnummer from this manufacturer cover: Gutachten-Nr., Genehmigungsnummer, ABE … NR., Rad-Gutachten-Nr., or similar. Works for wheels, spoilers, spacers, and other ABE parts. Always extract when visible — even when KBA is also present.",
      },
      manufacturer: {
        type: ["string", "null"],
        description:
          FROM_DOCUMENT +
          'Manufacturer or brand on the cover: "Hersteller", "Herstellerzeichen", or "Marke". Short mark codes are valid.',
      },
      designType: {
        type: ["string", "null"],
        description:
          FROM_DOCUMENT +
          "Product type or design name (DESIGN, TYP, Bezeichnung, Modell). Join multiple lines with ' / '.",
      },
      dimensions: {
        type: ["string", "null"],
        description:
          FROM_DOCUMENT +
          "Key dimensions or size specs (GRÖSSE, Maße, Abmessungen, Spurverbreiterung mm, etc.).",
      },
      articleNumbers: {
        type: "array",
        items: { type: "string" },
        description:
          FROM_DOCUMENT +
          "All article / part numbers on the cover (Artikel-Nr., ZU RAD-ARTIKEL-NR., Sachnummer, etc.). Empty array if none.",
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
          'Value next to "Inhaber der ABE", "Auftraggeber", or combined holder/manufacturer label.',
      },
      manufacturer: {
        type: ["string", "null"],
        description:
          FROM_DOCUMENT +
          'Value next to "Hersteller", "Herstellerzeichen", or "Marke" when shown separately.',
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
                FROM_DOCUMENT +
                "Verkaufsbezeichnung section header for this row group. Repeat the exact header text from 'Verkaufsbezeichnung:' on EVERY row in the group, even continuation rows.",
            },
            fahrzeugtyp: {
              type: ["string", "null"],
              description:
                FROM_DOCUMENT +
                "Fahrzeugtyp column cell for this row (short code). Null if not visible.",
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
                "Tyre sizes from Reifen column when present. Empty array if no Reifen column (e.g. spoiler, spacer).",
            },
            auflagenCodes: {
              type: "array",
              items: { type: "string" },
              description:
                FROM_DOCUMENT +
                ABE_AUFLAGEN_COLUMN_LLM_HINT +
                " Never copy codes from other rows or Verkaufsbezeichnung sections above/below.",
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
  const abeNumber = main?.abeNumber ?? null;
  const abeHolder =
    main?.abeHolder ?? main?.manufacturer ?? cover.manufacturer ?? null;
  const manufacturer =
    cover.manufacturer ?? main?.manufacturer ?? main?.abeHolder ?? null;

  return {
    kbaNumber: cover.kbaNumber,
    approvalNumber: cover.approvalNumber,
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
