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
  });
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
  const notesParts = [
    data.vehicleMatchNotes?.trim(),
    data.certificateNumber
      ? `Gutachten-Nr.: ${data.certificateNumber.trim()}`
      : null,
    data.testOrganization
      ? `Prüforganisation: ${data.testOrganization.trim()}`
      : null,
  ].filter(Boolean);

  return {
    vendor: data.testOrganization?.trim() || null,
    date: data.issueDate ?? null,
    amount: null,
    category: "abe",
    summary: gutachtenTitle(data),
    lineItems: null,
    kbaNumber: data.certificateNumber?.trim() || null,
    vehicleApprovals: data.vehicleMatchNotes?.trim()
      ? [data.vehicleMatchNotes.trim()]
      : null,
    authority: data.testOrganization?.trim() || null,
    conditions: null,
    partCategory: data.partName.trim() || null,
    notes: notesParts.length > 0 ? notesParts.join("\n\n") : null,
    manufacturer: data.manufacturer?.trim() || null,
    invoiceNumber: data.certificateNumber?.trim() || null,
    mileageKm: null,
  };
}
