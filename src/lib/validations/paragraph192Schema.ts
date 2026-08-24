import { z } from "zod";

import type { ApprovalFields } from "@/lib/documents/approval-fields";
import { normalizeAbeDate } from "@/lib/ocr/abe-parse-schema";
import { normalizeTextParseResult } from "@/lib/ocr/text-parse-schema";
import type { InvoiceTextParseResult } from "@/lib/ocr/text-parse-schema";
import type { Pruefung192 } from "@/lib/validations/documentSchemas";
import {
  isPlausibleVin,
  normalizeVin,
  verifyVinMatch,
} from "@/lib/vehicles/vin";

/** § 19 Abs. 2 StVZO Prüfung / Anbauabnahme — TÜV inspection report fields. */

export const PRUEFUNG192_INSPECTION_RESULTS = [
  "no_defects",
  "minor_defects",
  "major_defects",
  "failed",
] as const;

export type Pruefung192InspectionResult =
  (typeof PRUEFUNG192_INSPECTION_RESULTS)[number];

export class MissingPruefung192VinError extends Error {
  constructor(
    message = "Fahrzeug-Ident-Nr. (VIN) fehlt — §19(2)-Prüfung ohne VIN ist ungültig.",
  ) {
    super(message);
    this.name = "MissingPruefung192VinError";
  }
}

export const Paragraph192LlmPayloadSchema = z
  .object({
    reportNumber: z.string().trim().min(1).max(120).nullable(),
    inspectionDate: z.string().trim().min(1).max(32).nullable(),
    vin: z.string().trim().min(1).max(32).nullable(),
    licensePlate: z.string().trim().min(1).max(24).nullable(),
    manufacturer: z.string().trim().min(1).max(160).nullable(),
    vehicleType: z.string().trim().min(1).max(120).nullable(),
    variant: z.string().trim().min(1).max(80).nullable(),
    ownerName: z.string().trim().min(1).max(160).nullable(),
    testingOrganization: z.string().trim().min(1).max(160).nullable(),
    inspectionLocation: z.string().trim().min(1).max(200).nullable(),
    inspectionResultText: z.string().trim().min(1).max(200).nullable(),
    mileageKm: z.number().int().min(1).max(2_000_000).nullable(),
    firstRegistration: z.string().trim().min(1).max(32).nullable(),
    lastHu: z.string().trim().min(1).max(32).nullable(),
    officialExpert: z.string().trim().min(1).max(200).nullable(),
    /** Field 22 — Gutachten page only; verbatim Änderungen. */
    field22Text: z.string().trim().min(1).max(8_000).nullable(),
    /** Aufstellung — begutachtete Änderungen summary line. */
    assessedModifications: z.string().trim().min(1).max(2_000).nullable(),
    typeApprovalBase: z.string().trim().min(1).max(120).nullable(),
  })
  .strict();

export type Paragraph192LlmPayload = z.infer<typeof Paragraph192LlmPayloadSchema>;

export const Paragraph192ExtractionSchema = z
  .object({
    reportNumber: z.string().trim().min(1).max(120).nullable(),
    inspectionDate: z.string().trim().min(1).max(32).nullable(),
    vin: z.string().trim().min(5).max(32),
    licensePlate: z.string().trim().min(1).max(24).nullable(),
    manufacturer: z.string().trim().min(1).max(160).nullable(),
    vehicleType: z.string().trim().min(1).max(120).nullable(),
    variant: z.string().trim().min(1).max(80).nullable(),
    ownerName: z.string().trim().min(1).max(160).nullable(),
    testingOrganization: z.string().trim().min(1).max(160).nullable(),
    inspectionLocation: z.string().trim().min(1).max(200).nullable(),
    inspectionResult: z.enum(PRUEFUNG192_INSPECTION_RESULTS).nullable(),
    mileageKm: z.number().int().min(1).max(2_000_000).nullable(),
    firstRegistration: z.string().trim().min(1).max(32).nullable(),
    lastHu: z.string().trim().min(1).max(32).nullable(),
    officialExpert: z.string().trim().min(1).max(200).nullable(),
    field22Text: z.string().trim().min(1).max(8_000).nullable(),
    assessedModifications: z.string().trim().min(1).max(2_000).nullable(),
    typeApprovalBase: z.string().trim().min(1).max(120).nullable(),
    zbTablePreserved: z.boolean(),
  })
  .strict();

export type Paragraph192Extraction = z.infer<typeof Paragraph192ExtractionSchema>;

export const PARAGRAPH_192_JSON_SCHEMA = {
  name: "paragraph192_extraction",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "reportNumber",
      "inspectionDate",
      "vin",
      "licensePlate",
      "manufacturer",
      "vehicleType",
      "variant",
      "ownerName",
      "testingOrganization",
      "inspectionLocation",
      "inspectionResultText",
      "mileageKm",
      "firstRegistration",
      "lastHu",
      "officialExpert",
      "field22Text",
      "assessedModifications",
      "typeApprovalBase",
    ],
    properties: {
      reportNumber: {
        type: ["string", "null"],
        description: 'Untersuchungsbericht number, e.g. "PVR701DD-0".',
      },
      inspectionDate: {
        type: ["string", "null"],
        description: 'Prüftermin / inspection date, e.g. "08.05.2026".',
      },
      vin: {
        type: ["string", "null"],
        description: "Fahrzeug-Ident-Nr. (VIN). CRITICAL.",
      },
      licensePlate: {
        type: ["string", "null"],
        description: 'Amtl. Kennzeichen, e.g. "EU JG 183".',
      },
      manufacturer: {
        type: ["string", "null"],
        description: 'Fahrzeughersteller, e.g. "BAYER.MOT.WERKE-BMW".',
      },
      vehicleType: {
        type: ["string", "null"],
        description: 'Fahrzeugtyp line, e.g. "5K / AYU00006".',
      },
      variant: {
        type: ["string", "null"],
        description: 'Variante, e.g. "MX51".',
      },
      ownerName: {
        type: ["string", "null"],
        description: "Fahrzeughalter:in name.",
      },
      testingOrganization: {
        type: ["string", "null"],
        description: 'Prüforganisation, e.g. "TÜV Rheinland".',
      },
      inspectionLocation: {
        type: ["string", "null"],
        description: "Prüfungsort / Servicebüro address.",
      },
      inspectionResultText: {
        type: ["string", "null"],
        description: 'Ergebnis line, e.g. "Ohne Mängel".',
      },
      mileageKm: {
        type: ["integer", "null"],
        description: "Stand Wegstreckenzähler in km.",
      },
      firstRegistration: {
        type: ["string", "null"],
        description: "Erstzulassung date.",
      },
      lastHu: {
        type: ["string", "null"],
        description: "Letzte HU date.",
      },
      officialExpert: {
        type: ["string", "null"],
        description: "Prüfer / Sachverständiger name.",
      },
      field22Text: {
        type: ["string", "null"],
        description:
          'Field 22 Bemerkungen on Gutachten page — ENTIRE block verbatim. Do NOT extract the ZB grid (B,J,E,2.1).',
      },
      assessedModifications: {
        type: ["string", "null"],
        description:
          'Line after "begutachtete Änderungen:" on Aufstellung der technischen Vorschriften.',
      },
      typeApprovalBase: {
        type: ["string", "null"],
        description: 'Typgenehmigungsnr. Basisfahrzeug, e.g. "e1*2007/46*0455*01".',
      },
    },
  },
} as const;

function normalizeOptionalText(
  value: string | null | undefined,
  max: number,
): string | null {
  if (!value) return null;
  const trimmed = value.trim().replace(/\s+/g, " ").slice(0, max);
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeField22(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim().slice(0, 8_000);
  return trimmed.length > 0 ? trimmed : null;
}

export function inferPruefung192InspectionResult(
  text: string | null | undefined,
): Pruefung192InspectionResult | null {
  if (!text?.trim()) return null;
  const lower = text.toLowerCase();
  if (/ohne\s+m[aä]ngel|keine\s+m[aä]ngel|m[aä]ngelfrei/i.test(lower)) {
    return "no_defects";
  }
  if (/nicht\s+verkehrssicher|durchgefallen|nicht\s+bestanden/i.test(lower)) {
    return "failed";
  }
  if (/schwerer\s+m[aä]ngel|gef[aä]hrlicher\s+m[aä]ngel|gm\b/i.test(lower)) {
    return "major_defects";
  }
  if (/m[aä]ngel|nachbesserung|em\b/i.test(lower)) {
    return "minor_defects";
  }
  return null;
}

export function inferTestingOrganizationLabel(
  value: string | null | undefined,
): Pruefung192["testingOrganization"] {
  if (!value?.trim()) return "other";
  const upper = value.toUpperCase();
  if (upper.includes("TÜV") || upper.includes("TUV")) return "TÜV";
  if (upper.includes("DEKRA")) return "DEKRA";
  if (upper.includes("GTÜ") || upper.includes("GTU")) return "GTÜ";
  if (upper.includes("KÜS") || upper.includes("KUS")) return "KÜS";
  return "other";
}

export function normalizeParagraph192Extraction(
  fields: Paragraph192LlmPayload,
  options: { zbTablePreserved?: boolean; requireVin?: boolean } = {},
): Paragraph192Extraction {
  const vin = normalizeVin(fields.vin);
  if (!vin && options.requireVin !== false) {
    throw new MissingPruefung192VinError();
  }

  const normalized: Paragraph192Extraction = {
    reportNumber: normalizeOptionalText(fields.reportNumber, 120),
    inspectionDate:
      normalizeAbeDate(fields.inspectionDate) ??
      normalizeOptionalText(fields.inspectionDate, 32),
    vin: vin ?? "UNKNOWN",
    licensePlate: normalizeOptionalText(fields.licensePlate, 24),
    manufacturer: normalizeOptionalText(fields.manufacturer, 160),
    vehicleType: normalizeOptionalText(fields.vehicleType, 120),
    variant: normalizeOptionalText(fields.variant, 80),
    ownerName: normalizeOptionalText(fields.ownerName, 160),
    testingOrganization: normalizeOptionalText(fields.testingOrganization, 160),
    inspectionLocation: normalizeOptionalText(fields.inspectionLocation, 200),
    inspectionResult: inferPruefung192InspectionResult(fields.inspectionResultText),
    mileageKm: fields.mileageKm,
    firstRegistration:
      normalizeAbeDate(fields.firstRegistration) ??
      normalizeOptionalText(fields.firstRegistration, 32),
    lastHu:
      normalizeOptionalText(fields.lastHu, 32),
    officialExpert: normalizeOptionalText(fields.officialExpert, 200),
    field22Text: normalizeField22(fields.field22Text),
    assessedModifications: normalizeOptionalText(fields.assessedModifications, 2_000),
    typeApprovalBase: normalizeOptionalText(fields.typeApprovalBase, 120),
    zbTablePreserved: options.zbTablePreserved ?? false,
  };

  if (options.requireVin !== false && !isPlausibleVin(normalized.vin)) {
    throw new MissingPruefung192VinError();
  }

  return Paragraph192ExtractionSchema.parse(normalized);
}

export function emptyParagraph192LlmPayload(): Paragraph192LlmPayload {
  return {
    reportNumber: null,
    inspectionDate: null,
    vin: null,
    licensePlate: null,
    manufacturer: null,
    vehicleType: null,
    variant: null,
    ownerName: null,
    testingOrganization: null,
    inspectionLocation: null,
    inspectionResultText: null,
    mileageKm: null,
    firstRegistration: null,
    lastHu: null,
    officialExpert: null,
    field22Text: null,
    assessedModifications: null,
    typeApprovalBase: null,
  };
}

export function mergeParagraph192Extractions(
  base: Paragraph192Extraction,
  patch: Paragraph192Extraction,
): Paragraph192Extraction {
  const pickLonger = (a: string | null, b: string | null) => {
    const left = a?.trim() ?? "";
    const right = b?.trim() ?? "";
    if (!left) return right || null;
    if (!right) return left;
    return right.length > left.length ? right : left;
  };

  return Paragraph192ExtractionSchema.parse({
    ...base,
    reportNumber: patch.reportNumber ?? base.reportNumber,
    inspectionDate: patch.inspectionDate ?? base.inspectionDate,
    vin: patch.vin !== "UNKNOWN" ? patch.vin : base.vin,
    licensePlate: patch.licensePlate ?? base.licensePlate,
    manufacturer: pickLonger(base.manufacturer, patch.manufacturer),
    vehicleType: pickLonger(base.vehicleType, patch.vehicleType),
    variant: patch.variant ?? base.variant,
    ownerName: patch.ownerName ?? base.ownerName,
    testingOrganization: pickLonger(base.testingOrganization, patch.testingOrganization),
    inspectionLocation: pickLonger(base.inspectionLocation, patch.inspectionLocation),
    inspectionResult: patch.inspectionResult ?? base.inspectionResult,
    mileageKm: patch.mileageKm ?? base.mileageKm,
    firstRegistration: patch.firstRegistration ?? base.firstRegistration,
    lastHu: patch.lastHu ?? base.lastHu,
    officialExpert: patch.officialExpert ?? base.officialExpert,
    field22Text: pickLonger(base.field22Text, patch.field22Text),
    assessedModifications: pickLonger(base.assessedModifications, patch.assessedModifications),
    typeApprovalBase: patch.typeApprovalBase ?? base.typeApprovalBase,
    zbTablePreserved: base.zbTablePreserved || patch.zbTablePreserved,
  });
}

export function verifyPruefung192VinMatch(
  extractedVin: string,
  garageVin: string,
): boolean {
  return verifyVinMatch(extractedVin, garageVin);
}

export function paragraph192ToApprovalFields(
  extracted: Paragraph192Extraction,
): Extract<ApprovalFields, { kind: "pruefung192" }> {
  const data: Pruefung192 = {
    testingOrganization: inferTestingOrganizationLabel(extracted.testingOrganization),
    reportNumber: extracted.reportNumber ?? extracted.vin,
    inspectionResult: extracted.inspectionResult,
    field22Text:
      extracted.field22Text ??
      extracted.assessedModifications ??
      "Siehe Originaldokument",
    assessedModifications: extracted.assessedModifications,
    officialExpert: extracted.officialExpert ?? "Siehe Originaldokument",
    zbTablePreserved: extracted.zbTablePreserved,
  };
  return { kind: "pruefung192", data };
}

const INSPECTION_RESULT_LABELS: Record<Pruefung192InspectionResult, string> = {
  no_defects: "Ohne Mängel",
  minor_defects: "Mit Mängeln",
  major_defects: "Schwere Mängel",
  failed: "Nicht bestanden",
};

export function paragraph192ToAnalyzeFields(
  extracted: Paragraph192Extraction,
  vinMatched: boolean | null = null,
): InvoiceTextParseResult {
  const matchNote =
    vinMatched === true
      ? "VIN stimmt mit Garage-Fahrzeug überein."
      : vinMatched === false
        ? "WARNUNG: VIN stimmt NICHT mit Garage-Fahrzeug überein."
        : null;

  const notes = [
    extracted.licensePlate ? `Kennzeichen: ${extracted.licensePlate}` : null,
    extracted.ownerName ? `Halter: ${extracted.ownerName}` : null,
    extracted.inspectionResult
      ? `Ergebnis: ${INSPECTION_RESULT_LABELS[extracted.inspectionResult]}`
      : null,
    extracted.field22Text ? `Feld 22:\n${extracted.field22Text}` : null,
    extracted.assessedModifications
      ? `Begutachtete Änderungen:\n${extracted.assessedModifications}`
      : null,
    extracted.typeApprovalBase
      ? `Typgenehmigung Basisfahrzeug: ${extracted.typeApprovalBase}`
      : null,
    matchNote,
  ]
    .filter(Boolean)
    .join("\n\n");

  return normalizeTextParseResult({
    vendor: extracted.vehicleType,
    date: extracted.inspectionDate,
    amount: null,
    category: "abe",
    summary: extracted.manufacturer
      ? `§19(2) Prüfung · ${extracted.manufacturer}`
      : "§19(2) Prüfung",
    lineItems: null,
    kbaNumber: extracted.reportNumber,
    vehicleApprovals: extracted.vin ? [`VIN ${extracted.vin}`] : null,
    authority: extracted.testingOrganization,
    conditions: extracted.field22Text
      ? [extracted.field22Text.slice(0, 500)]
      : null,
    partCategory: extracted.assessedModifications,
    notes: notes || null,
    manufacturer: extracted.manufacturer,
    invoiceNumber: extracted.reportNumber,
    mileageKm: extracted.mileageKm,
  });
}

export function inspectionResultLabel(
  result: Pruefung192InspectionResult | null | undefined,
): string | null {
  if (!result) return null;
  return INSPECTION_RESULT_LABELS[result];
}
