import { z } from "zod";

import type { ApprovalFields } from "@/lib/documents/approval-fields";
import type { ApprovalFieldKind } from "@/lib/documents/approval-fields";
import { normalizeDocumentDateIso } from "@/lib/documents/format";
import type { InvoiceTextParseResult } from "@/lib/ocr/text-parse-schema";

/** AI-detected Gutachten / Prüfbericht subtype. */
export const GUTACHTEN_DOCUMENT_SUBTYPES = [
  "TEILEGUTACHTEN",
  "EINZELABNAHME",
  "ANBAUBESTAETIGUNG",
  "SONSTIGES",
] as const;

export type GutachtenDocumentSubtype =
  (typeof GUTACHTEN_DOCUMENT_SUBTYPES)[number];

export const GUTACHTEN_SUBTYPE_LABELS: Record<
  GutachtenDocumentSubtype,
  string
> = {
  TEILEGUTACHTEN: "Teilegutachten (§19 Abs. 3)",
  EINZELABNAHME: "Einzelabnahme (§21)",
  ANBAUBESTAETIGUNG: "Anbauabnahme / Prüfbericht",
  SONSTIGES: "Sonstiges Gutachten",
};

export const gutachtenExtractionSchema = z
  .object({
    documentSubtype: z.enum(GUTACHTEN_DOCUMENT_SUBTYPES),
    partName: z
      .string()
      .trim()
      .min(1)
      .max(240)
      .describe(
        "Name/Description of the component, e.g., KW V3 Gewindefahrwerk",
      ),
    manufacturer: z.string().trim().min(1).max(160).optional(),
    certificateNumber: z
      .string()
      .trim()
      .min(1)
      .max(120)
      .optional()
      .describe("Gutachten- or Report Number, e.g., 14-TG-0892-00"),
    testOrganization: z
      .string()
      .trim()
      .min(1)
      .max(160)
      .optional()
      .describe("Prüforganisation, e.g., TÜV Rheinland, DEKRA, GTÜ"),
    issueDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .describe("Date of issuance (YYYY-MM-DD)"),
    vehicleMatchNotes: z
      .string()
      .trim()
      .min(1)
      .max(2_000)
      .optional()
      .describe(
        "Key vehicle restrictions or approval notes, e.g., nur für F11 xDrive",
      ),
    /** Full Art der Umrüstung block from cover when visible. */
    modificationType: z.string().trim().min(1).max(500).optional(),
    /** Kennzeichnung on the component — cover or marking scan. */
    markingType: z.string().trim().min(1).max(200).optional(),
    markingNumber: z.string().trim().min(1).max(120).optional(),
    /** Section IV Auflagen / conditions from cover when readable. */
    conditions: z
      .array(z.string().trim().min(1).max(2_400))
      .max(40)
      .optional(),
    /** Section III Hinweise für den Fahrzeughalter. */
    ownerNotes: z.string().trim().min(1).max(2_400).optional(),
    /** Matched Verwendungsbereich row, e.g. BMW · F11 · 520d. */
    matchedVehicleRow: z.string().trim().min(1).max(500).optional(),
    /** §21 / §19(2) — Field E when visible on cover. */
    vin: z.string().trim().min(5).max(32).optional(),
    /** §21 / §19(2) — Field 22 Bemerkungen when on cover. */
    modificationsField22: z.string().trim().min(1).max(8_000).optional(),
  })
  .strict();

export type GutachtenExtraction = z.infer<typeof gutachtenExtractionSchema>;

export const GUTACHTEN_JSON_SCHEMA = {
  name: "gutachten_extraction",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "documentSubtype",
      "partName",
      "manufacturer",
      "certificateNumber",
      "testOrganization",
      "issueDate",
      "vehicleMatchNotes",
      "modificationType",
      "markingType",
      "markingNumber",
      "conditions",
      "ownerNotes",
      "matchedVehicleRow",
      "vin",
      "modificationsField22",
    ],
    properties: {
      documentSubtype: {
        type: "string",
        enum: [...GUTACHTEN_DOCUMENT_SUBTYPES],
        description:
          "TEILEGUTACHTEN=§19.3 Teilegutachten, EINZELABNAHME=§21, ANBAUBESTAETIGUNG=TÜV/DEKRA Anbauabnahme §19.2, SONSTIGES=other expert report",
      },
      partName: {
        type: "string",
        description: "Component or modification name",
      },
      manufacturer: { type: ["string", "null"] },
      certificateNumber: { type: ["string", "null"] },
      testOrganization: { type: ["string", "null"] },
      issueDate: {
        type: ["string", "null"],
        description: "YYYY-MM-DD or null",
      },
      vehicleMatchNotes: { type: ["string", "null"] },
      modificationType: { type: ["string", "null"] },
      markingType: { type: ["string", "null"] },
      markingNumber: { type: ["string", "null"] },
      conditions: {
        type: ["array", "null"],
        items: { type: "string" },
      },
      ownerNotes: { type: ["string", "null"] },
      matchedVehicleRow: { type: ["string", "null"] },
      vin: { type: ["string", "null"] },
      modificationsField22: { type: ["string", "null"] },
    },
  },
} as const;

const GutachtenLlmPayloadSchema = z
  .object({
    documentSubtype: z.enum(GUTACHTEN_DOCUMENT_SUBTYPES),
    partName: z.string(),
    manufacturer: z.string().nullable(),
    certificateNumber: z.string().nullable(),
    testOrganization: z.string().nullable(),
    issueDate: z.string().nullable(),
    vehicleMatchNotes: z.string().nullable(),
    modificationType: z.string().nullable(),
    markingType: z.string().nullable(),
    markingNumber: z.string().nullable(),
    conditions: z.array(z.string()).nullable(),
    ownerNotes: z.string().nullable(),
    matchedVehicleRow: z.string().nullable(),
    vin: z.string().nullable(),
    modificationsField22: z.string().nullable(),
  })
  .strict();

function normalizeOptionalString(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeIssueDate(value: string | null | undefined): string | undefined {
  if (!value?.trim()) return undefined;
  const normalized = normalizeDocumentDateIso(value.trim());
  if (!normalized) return undefined;
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : undefined;
}

function normalizeConditions(
  value: string[] | null | undefined,
): string[] | undefined {
  if (!value?.length) return undefined;
  const items = value
    .map((entry) => entry.trim())
    .filter(Boolean)
    .slice(0, 40);
  return items.length > 0 ? items : undefined;
}

export function mergeGutachtenExtractions(
  base: GutachtenExtraction,
  patch: Partial<GutachtenExtraction>,
): GutachtenExtraction {
  const pickLonger = (
    left: string | undefined,
    right: string | undefined,
  ): string | undefined => {
    if (!left?.trim()) return right?.trim() || undefined;
    if (!right?.trim()) return left.trim();
    return right.trim().length > left.trim().length ? right.trim() : left.trim();
  };

  const mergedConditions = [
    ...(base.conditions ?? []),
    ...(patch.conditions ?? []),
  ]
    .map((entry) => entry.trim())
    .filter(Boolean);

  return gutachtenExtractionSchema.parse({
    ...base,
    ...patch,
    documentSubtype: patch.documentSubtype ?? base.documentSubtype,
    partName: pickLonger(base.partName, patch.partName) ?? base.partName,
    modificationType: pickLonger(base.modificationType, patch.modificationType),
    manufacturer: pickLonger(base.manufacturer, patch.manufacturer),
    certificateNumber: pickLonger(
      base.certificateNumber,
      patch.certificateNumber,
    ),
    testOrganization: pickLonger(
      base.testOrganization,
      patch.testOrganization,
    ),
    issueDate:
      normalizeIssueDate(patch.issueDate) ??
      base.issueDate,
    vehicleMatchNotes: pickLonger(
      base.vehicleMatchNotes,
      patch.vehicleMatchNotes,
    ),
    markingType: pickLonger(base.markingType, patch.markingType),
    markingNumber: pickLonger(base.markingNumber, patch.markingNumber),
    ownerNotes: pickLonger(base.ownerNotes, patch.ownerNotes),
    matchedVehicleRow: pickLonger(
      base.matchedVehicleRow,
      patch.matchedVehicleRow,
    ),
    vin: pickLonger(base.vin, patch.vin),
    modificationsField22: pickLonger(
      base.modificationsField22,
      patch.modificationsField22,
    ),
    conditions:
      mergedConditions.length > 0
        ? [...new Set(mergedConditions)]
        : undefined,
  });
}

export function normalizeGutachtenExtraction(
  payload: unknown,
): GutachtenExtraction {
  const parsed = GutachtenLlmPayloadSchema.parse(payload);
  const partName = parsed.partName.trim();
  if (!partName) {
    throw new Error("partName is required");
  }

  return gutachtenExtractionSchema.parse({
    documentSubtype: parsed.documentSubtype,
    partName,
    manufacturer: normalizeOptionalString(parsed.manufacturer),
    certificateNumber: normalizeOptionalString(parsed.certificateNumber),
    testOrganization: normalizeOptionalString(parsed.testOrganization),
    issueDate: normalizeIssueDate(parsed.issueDate),
    vehicleMatchNotes: normalizeOptionalString(parsed.vehicleMatchNotes),
    modificationType: normalizeOptionalString(parsed.modificationType),
    markingType: normalizeOptionalString(parsed.markingType),
    markingNumber: normalizeOptionalString(parsed.markingNumber),
    conditions: normalizeConditions(parsed.conditions),
    ownerNotes: normalizeOptionalString(parsed.ownerNotes),
    matchedVehicleRow: normalizeOptionalString(parsed.matchedVehicleRow),
    vin: normalizeOptionalString(parsed.vin),
    modificationsField22: normalizeOptionalString(parsed.modificationsField22),
  });
}

/** Like {@link mergeGutachtenExtractions} but never throws — returns base on invalid patch. */
export function mergeGutachtenExtractionsSafe(
  base: GutachtenExtraction,
  patch: Partial<GutachtenExtraction>,
): GutachtenExtraction {
  try {
    return mergeGutachtenExtractions(base, patch);
  } catch {
    return base;
  }
}

/** Map legacy approval kinds to unified Gutachten subtype. */
export function legacyApprovalKindToGutachtenSubtype(
  kind: ApprovalFieldKind,
): GutachtenDocumentSubtype | null {
  switch (kind) {
    case "teilegutachten":
      return "TEILEGUTACHTEN";
    case "einzelabnahme":
      return "EINZELABNAHME";
    case "pruefung192":
      return "ANBAUBESTAETIGUNG";
    default:
      return null;
  }
}

export function gutachtenTitle(data: GutachtenExtraction): string {
  const label = GUTACHTEN_SUBTYPE_LABELS[data.documentSubtype];
  const base = data.partName.trim();
  return base ? `${label.split(" (")[0]} · ${base}` : label;
}

export function gutachtenToApprovalFields(
  data: GutachtenExtraction,
): Extract<ApprovalFields, { kind: "gutachten" }> {
  return { kind: "gutachten", data };
}

export function gutachtenToAnalyzeFields(
  data: GutachtenExtraction,
): InvoiceTextParseResult {
  const markingNote =
    data.markingType?.trim() || data.markingNumber?.trim()
      ? [
          data.markingType?.trim(),
          data.markingNumber?.trim(),
        ]
          .filter(Boolean)
          .join(" · ")
      : null;

  const notesParts = [
    data.modificationType?.trim(),
    data.vehicleMatchNotes?.trim(),
    data.matchedVehicleRow?.trim()
      ? `Verwendungsbereich: ${data.matchedVehicleRow.trim()}`
      : null,
    data.modificationsField22?.trim(),
    data.ownerNotes?.trim(),
    markingNote ? `Kennzeichnung: ${markingNote}` : null,
    data.vin?.trim() ? `VIN: ${data.vin.trim()}` : null,
    data.certificateNumber
      ? `Gutachten-Nr.: ${data.certificateNumber.trim()}`
      : null,
    data.testOrganization
      ? `Prüforganisation: ${data.testOrganization.trim()}`
      : null,
  ].filter(Boolean);

  const vehicleApprovals = [
    data.matchedVehicleRow?.trim(),
    data.vehicleMatchNotes?.trim(),
  ].filter(Boolean) as string[];

  return {
    vendor: data.testOrganization?.trim() || null,
    date: data.issueDate ?? null,
    amount: null,
    category: "abe",
    summary: gutachtenTitle(data),
    lineItems: null,
    kbaNumber: data.certificateNumber?.trim() || null,
    vehicleApprovals:
      vehicleApprovals.length > 0 ? [...new Set(vehicleApprovals)] : null,
    authority: data.testOrganization?.trim() || null,
    conditions: data.conditions?.length ? data.conditions : null,
    partCategory:
      data.modificationType?.trim() || data.partName.trim() || null,
    notes: notesParts.length > 0 ? notesParts.join("\n\n") : null,
    manufacturer: data.manufacturer?.trim() || null,
    invoiceNumber: data.certificateNumber?.trim() || null,
    mileageKm: null,
  };
}
