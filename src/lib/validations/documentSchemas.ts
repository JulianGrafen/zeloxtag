import { z } from "zod";

import { TableDataSchema } from "@/lib/validations/abeSchema";

/**
 * Strict Zod schemas for German automotive approval documents.
 * Used by Strategy services in `@/services/documents`.
 */

export const AUTOMOTIVE_DOCUMENT_TYPES = [
  "teilegutachten",
  "einzelabnahme",
  "egbe",
  "tuev",
] as const;

export type AutomotiveDocumentType = (typeof AUTOMOTIVE_DOCUMENT_TYPES)[number];

export const TESTING_ORGANIZATIONS = [
  "TÜV",
  "DEKRA",
  "GTÜ",
  "KÜS",
  "other",
] as const;

export type TestingOrganization = (typeof TESTING_ORGANIZATIONS)[number];

export const TUEV_RESULTS = [
  "no_defects",
  "minor_defects",
  "major_defects",
  "dangerous_defects",
  "failed",
] as const;

export type TuevResult = (typeof TUEV_RESULTS)[number];

export const TUEV_DEFECT_SEVERITIES = ["EM", "GM"] as const;
export type TuevDefectSeverity = (typeof TUEV_DEFECT_SEVERITIES)[number];

export const TuevDefectRowSchema = z
  .object({
    checkpoint: z.string().trim().min(1).max(24).nullable(),
    description: z.string().trim().min(1).max(500),
    severity: z.enum(TUEV_DEFECT_SEVERITIES).nullable(),
  })
  .strict();

export type TuevDefectRow = z.infer<typeof TuevDefectRowSchema>;

const nonEmpty = (max: number) => z.string().trim().min(1).max(max);
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD");
const yearMonth = z
  .string()
  .regex(/^\d{4}-\d{2}$/, "Month must be YYYY-MM");

/**
 * Teilegutachten after § 19 Abs. 3 StVZO
 * (Prüforganisation + Verwendungsbereich + Abnahme-Auflagen).
 */
export const TeilegutachtenSchema = z
  .object({
    testingOrganization: z.enum(TESTING_ORGANIZATIONS),
    documentNumber: nonEmpty(120),
    validityArea: nonEmpty(2_000),
    immediateInspectionRequired: z.boolean(),
    /** Structured Verwendungsbereich — Hersteller · Typ · Modell only. */
    compatibilityTable: TableDataSchema.nullable().optional(),
    /** Section II — Technische Daten. */
    technicalDataTable: TableDataSchema.nullable().optional(),
    /** Section III — Hinweise für den Fahrzeughalter (verbatim). */
    ownerNotes: z.string().trim().min(1).max(8_000).nullable().optional(),
    /** Art der Kennzeichnung am Bauteil. */
    markingType: z.string().trim().min(1).max(200).nullable().optional(),
    /** Kennzeichnungsnummer / Nummer am Bauteil. */
    markingNumber: z.string().trim().min(1).max(120).nullable().optional(),
  })
  .strict();

export type Teilegutachten = z.infer<typeof TeilegutachtenSchema>;

/**
 * Einzelabnahme / Änderungsabnahme after § 21 / § 19 Abs. 2 StVZO.
 */
export const EinzelabnahmeSchema = z
  .object({
    officialExpert: nonEmpty(200),
    reportNumber: nonEmpty(120),
    field22Text: nonEmpty(4_000),
  })
  .strict();

export type Einzelabnahme = z.infer<typeof EinzelabnahmeSchema>;

/**
 * EG / ECE type approval (E-Prüfzeichen).
 */
export const EGBESchema = z
  .object({
    eMark: nonEmpty(160).regex(
      /^e\d+/i,
      "eMark must start with an E-mark (e.g. e1*…)",
    ),
    componentGroup: nonEmpty(120),
  })
  .strict();

export type EGBE = z.infer<typeof EGBESchema>;

/**
 * HU / AU inspection report (Haupt- und Abgasuntersuchung / TÜV-Bericht).
 * Nullable fields tolerate missing OCR; organization + result are required.
 * Festgestellte Mängel are always under Punkt 6 / Abschnitt 6 of the report.
 */
export const TuevReportSchema = z
  .object({
    testingOrganization: z.enum(TESTING_ORGANIZATIONS),
    testDate: isoDate.nullable(),
    result: z.enum(TUEV_RESULTS),
    mileageKm: z.number().int().nonnegative().max(9_999_999).nullable(),
    nextInspectionDate: yearMonth.nullable(),
    documentNumber: z.string().trim().min(1).max(120).nullable(),
    /** Structured Mängel from Punkt 6 (Prüfpunkt + description + EM/GM). */
    defectsTable: z.array(TuevDefectRowSchema).max(80).nullable(),
    /** Plain-text Mängel from Punkt 6 — legacy / display fallback. */
    defectsList: z
      .array(z.string().trim().min(1).max(500))
      .max(80)
      .nullable(),
  })
  .strict();

export type TuevReport = z.infer<typeof TuevReportSchema>;

export const automotiveDocumentTypeSchema = z.enum(AUTOMOTIVE_DOCUMENT_TYPES);

/** Map document type → Zod schema (single source for factory / tests). */
export const DOCUMENT_SCHEMAS = {
  teilegutachten: TeilegutachtenSchema,
  einzelabnahme: EinzelabnahmeSchema,
  egbe: EGBESchema,
  tuev: TuevReportSchema,
} as const;

export type DocumentSchemaMap = typeof DOCUMENT_SCHEMAS;

export type ParsedDocumentByType = {
  [K in AutomotiveDocumentType]: z.infer<DocumentSchemaMap[K]>;
};
