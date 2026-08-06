import { z } from "zod";

import type { ApprovalFields } from "@/lib/documents/approval-fields";
import { normalizeTextParseResult } from "@/lib/ocr/text-parse-schema";
import type { InvoiceTextParseResult } from "@/lib/ocr/text-parse-schema";
import {
  ABE_USER_VEHICLE_MATCH_STATUSES,
  TableDataSchema,
  type TableData,
} from "@/lib/validations/abeSchema";
import {
  TESTING_ORGANIZATIONS,
  type Teilegutachten,
  type TestingOrganization,
} from "@/lib/validations/documentSchemas";

/**
 * Teilegutachten (§ 19 Abs. 3 StVZO) — LLM extraction schema.
 *
 * **UI implication:** A Teilegutachten is NOT valid on its own during a police
 * check — it mandates a physical inspection by a certified examiner. Any UI
 * consuming {@link TeilegutachtenExtractionSchema} MUST display a
 * **"Pending TÜV Inspection"** badge until the user links an **Anbauabnahme**
 * document to this record.
 *
 * Unlike an ABE (Allgemeine Betriebserlaubnis), a Teilegutachten cannot be
 * presented as standalone proof of roadworthiness.
 */

/** Raw LLM payload — {@link requiresPhysicalInspection} may be omitted by the model. */
export const TeilegutachtenLlmPayloadSchema = z
  .object({
    documentType: z.literal("Teilegutachten"),
    /** Gutachtennummer, e.g. "14-00123-CP-GBM". */
    certificateNumber: z.string().trim().min(1).max(120).nullable(),
    manufacturer: z.string().trim().min(1).max(120).nullable(),
    /** Part family, e.g. "Sonderfahrwerksfedern". */
    partCategory: z.string().trim().min(1).max(120).nullable(),
    /** Exact part type / model id, e.g. "Eibach 21-85-041-01-VA". */
    partType: z.string().trim().min(1).max(160).nullable(),
    /**
     * Kennzeichnung — how the part is physically marked on the component.
     * CRITICAL for the mandatory Anbauabnahme inspection.
     */
    physicalMarking: z.string().trim().min(1).max(500).nullable(),
    requiresPhysicalInspection: z.boolean().optional(),
    /** Prüforganisation / issuer, e.g. "TÜV SÜD Automotive GmbH". */
    testingOrganization: z.string().trim().min(1).max(200).nullable(),
    userVehicleMatchStatus: z
      .enum(ABE_USER_VEHICLE_MATCH_STATUSES)
      .nullable(),
    /** Full Verwendungsbereich section text. */
    verwendungsbereich: z.string().trim().min(1).max(2_000).nullable(),
    /** Auflagen under Verwendungsbereich — one item per bullet. */
    auflagen: z
      .array(z.string().trim().min(1).max(800))
      .max(40)
      .nullable(),
    /** @deprecated LLM alias — mapped to {@link auflagen}. */
    matchedConditions: z
      .array(z.string().trim().min(1).max(800))
      .max(40)
      .nullable()
      .optional(),
    matchedVehicleRow: z.string().trim().min(1).max(500).nullable(),
    compatibilityTable: TableDataSchema.nullable().optional(),
  })
  .strict();

export type TeilegutachtenLlmPayload = z.infer<
  typeof TeilegutachtenLlmPayloadSchema
>;

/** Validated extraction — physical inspection is always required for TGA. */
export const TeilegutachtenExtractionSchema = z
  .object({
    documentType: z.literal("Teilegutachten"),
    certificateNumber: z.string().trim().min(1).max(120).nullable(),
    manufacturer: z.string().trim().min(1).max(120).nullable(),
    partCategory: z.string().trim().min(1).max(120).nullable(),
    partType: z.string().trim().min(1).max(160).nullable(),
    physicalMarking: z.string().trim().min(1).max(500).nullable(),
    /** Always true — legal requirement under § 19 Abs. 3 StVZO. */
    requiresPhysicalInspection: z.literal(true),
    testingOrganization: z.string().trim().min(1).max(200).nullable(),
    userVehicleMatchStatus: z
      .enum(ABE_USER_VEHICLE_MATCH_STATUSES)
      .nullable(),
    verwendungsbereich: z.string().trim().min(1).max(2_000).nullable(),
    auflagen: z
      .array(z.string().trim().min(1).max(800))
      .max(40)
      .nullable(),
    matchedVehicleRow: z.string().trim().min(1).max(500).nullable(),
    compatibilityTable: TableDataSchema.nullable().optional(),
  })
  .strict();

export type TeilegutachtenExtraction = z.infer<
  typeof TeilegutachtenExtractionSchema
>;

/** OpenAI strict JSON Schema — keep in sync with {@link TeilegutachtenLlmPayloadSchema}. */
export const TEILEGUTACHTEN_JSON_SCHEMA = {
  name: "teilegutachten_extraction",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "documentType",
      "certificateNumber",
      "manufacturer",
      "partCategory",
      "partType",
      "physicalMarking",
      "requiresPhysicalInspection",
      "testingOrganization",
      "userVehicleMatchStatus",
      "verwendungsbereich",
      "auflagen",
      "matchedVehicleRow",
      "compatibilityTable",
    ],
    properties: {
      documentType: {
        type: "string",
        enum: ["Teilegutachten"],
        description:
          'Must be exactly "Teilegutachten". NOT an ABE, NOT a §21 Einzelabnahme.',
      },
      certificateNumber: {
        type: ["string", "null"],
        description:
          'Gutachtennummer / certificate number, e.g. "14-00123-CP-GBM".',
      },
      manufacturer: {
        type: ["string", "null"],
        description: 'Part manufacturer / Herstellerzeichen.',
      },
      partCategory: {
        type: ["string", "null"],
        description:
          'Part category in German, e.g. "Sonderfahrwerksfedern", "Frontspoiler".',
      },
      partType: {
        type: ["string", "null"],
        description:
          'Exact part type / model id, e.g. "Eibach 21-85-041-01-VA".',
      },
      physicalMarking: {
        type: ["string", "null"],
        description:
          'Kennzeichnung — how the part is marked physically, e.g. "Aufdruck auf den Federwindungen", "Eingegossen". CRITICAL.',
      },
      requiresPhysicalInspection: {
        type: "boolean",
        description:
          "Always true for Teilegutachten — mandates Anbauabnahme by a certified examiner.",
      },
      testingOrganization: {
        type: ["string", "null"],
        description:
          'Prüforganisation / issuer, e.g. "TÜV SÜD Automotive GmbH".',
      },
      userVehicleMatchStatus: {
        type: ["string", "null"],
        enum: [...ABE_USER_VEHICLE_MATCH_STATUSES, null],
        description:
          "verified | not_found | needs_manual_check for the TARGET vehicle. Null if no target vehicle was provided.",
      },
      verwendungsbereich: {
        type: ["string", "null"],
        description:
          'Full "Verwendungsbereich" section — vehicle applicability text. Extract verbatim where readable.',
      },
      auflagen: {
        type: ["array", "null"],
        description:
          'Auflagen / Bedingungen / Hinweise under Verwendungsbereich. One array item per bullet or numbered condition. Extract ALL listed Auflagen verbatim.',
        items: { type: "string" },
      },
      matchedVehicleRow: {
        type: ["string", "null"],
        description:
          "Exact Verwendungsbereich row text for the user's vehicle. Null if not verified.",
      },
      compatibilityTable: {
        type: ["object", "null"],
        additionalProperties: false,
        required: ["headers", "rows", "caption"],
        description:
          "Structured Verwendungsbereich table when readable; otherwise null. Match flags are applied server-side.",
        properties: {
          headers: {
            type: "array",
            items: { type: "string" },
          },
          rows: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["id", "cells", "isUserVehicleMatch", "matchReason"],
              properties: {
                id: { type: "string" },
                cells: { type: "array", items: { type: "string" } },
                isUserVehicleMatch: { type: "boolean" },
                matchReason: { type: ["string", "null"] },
              },
            },
          },
          caption: { type: ["string", "null"] },
        },
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

function normalizeAuflagen(
  values: string[] | null | undefined,
): string[] | null {
  if (!values?.length) return null;
  const cleaned = values
    .map((value) => value.trim().replace(/\s+/g, " ").slice(0, 800))
    .filter(Boolean)
    .slice(0, 40);
  return cleaned.length > 0 ? cleaned : null;
}

function normalizeVerwendungsbereich(
  value: string | null | undefined,
): string | null {
  if (!value) return null;
  const trimmed = value.trim().replace(/\s+/g, " ").slice(0, 2_000);
  return trimmed.length > 0 ? trimmed : null;
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

export function normalizeTeilegutachtenExtraction(
  fields: TeilegutachtenLlmPayload,
): TeilegutachtenExtraction {
  const status = fields.userVehicleMatchStatus;

  const normalized: TeilegutachtenExtraction = {
    documentType: "Teilegutachten",
    certificateNumber: normalizeOptionalText(fields.certificateNumber, 120),
    manufacturer: normalizeOptionalText(fields.manufacturer, 120),
    partCategory: normalizeOptionalText(fields.partCategory, 120),
    partType: normalizeOptionalText(fields.partType, 160),
    physicalMarking: normalizeOptionalText(fields.physicalMarking, 500),
    requiresPhysicalInspection: true,
    testingOrganization: normalizeOptionalText(fields.testingOrganization, 200),
    userVehicleMatchStatus: status ?? null,
    verwendungsbereich: normalizeVerwendungsbereich(fields.verwendungsbereich),
    auflagen: normalizeAuflagen(fields.auflagen ?? fields.matchedConditions),
    matchedVehicleRow: fields.matchedVehicleRow?.trim().slice(0, 500) || null,
    compatibilityTable: normalizeCompatibilityTable(fields.compatibilityTable),
  };

  return TeilegutachtenExtractionSchema.parse(normalized);
}

export function emptyTeilegutachtenLlmPayload(): TeilegutachtenLlmPayload {
  return {
    documentType: "Teilegutachten",
    certificateNumber: null,
    manufacturer: null,
    partCategory: null,
    partType: null,
    physicalMarking: null,
    requiresPhysicalInspection: true,
    testingOrganization: null,
    userVehicleMatchStatus: null,
    verwendungsbereich: null,
    auflagen: null,
    matchedVehicleRow: null,
    compatibilityTable: null,
  };
}

function mapTestingOrganization(
  value: string | null | undefined,
): TestingOrganization {
  if (!value) return "other";
  const folded = value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
  if (/\bdekra\b/.test(folded)) return "DEKRA";
  if (/\bgtue\b|\bgtu\b/.test(folded)) return "GTÜ";
  if (/\bkues\b|\bkus\b/.test(folded)) return "KÜS";
  if (/\btuv\b|\btuev\b/.test(folded)) return "TÜV";
  return TESTING_ORGANIZATIONS.includes(value as TestingOrganization)
    ? (value as TestingOrganization)
    : "other";
}

function buildValidityArea(extracted: TeilegutachtenExtraction): string {
  const parts = [
    extracted.verwendungsbereich,
    extracted.matchedVehicleRow &&
    extracted.matchedVehicleRow !== extracted.verwendungsbereich
      ? `Fahrzeugzeile: ${extracted.matchedVehicleRow}`
      : null,
    extracted.auflagen?.length
      ? `Auflagen:\n${extracted.auflagen.join("\n")}`
      : null,
    extracted.physicalMarking
      ? `Kennzeichnung: ${extracted.physicalMarking}`
      : null,
  ].filter(Boolean);

  if (parts.length === 0) {
    return "Verwendungsbereich siehe Originaldokument";
  }

  return parts.join("\n\n").slice(0, 2_000);
}

/** Map TGA extract → stored `approval_fields` (Teilegutachten subtype). */
export function teilegutachtenToApprovalFields(
  extracted: TeilegutachtenExtraction,
): Extract<ApprovalFields, { kind: "teilegutachten" }> {
  const data: Teilegutachten = {
    testingOrganization: mapTestingOrganization(extracted.testingOrganization),
    documentNumber: extracted.certificateNumber ?? "unbekannt",
    validityArea: buildValidityArea(extracted),
    immediateInspectionRequired: true,
  };
  return { kind: "teilegutachten", data };
}

/** Map TGA extract → analyze API / dashboard summary fields. */
export function teilegutachtenToAnalyzeFields(
  extracted: TeilegutachtenExtraction,
): InvoiceTextParseResult {
  const partLabel =
    [extracted.partCategory, extracted.partType].filter(Boolean).join(" · ") ||
    null;

  const inspectionNote =
    "Hinweis: Teilegutachten allein nicht straßenverkehrsrechtlich gültig — Anbauabnahme erforderlich.";

  const matchNotes = [
    extracted.userVehicleMatchStatus
      ? `Fahrzeug-Check: ${extracted.userVehicleMatchStatus}`
      : null,
    extracted.matchedVehicleRow
      ? `Trefferzeile: ${extracted.matchedVehicleRow}`
      : null,
    extracted.verwendungsbereich
      ? `Verwendungsbereich:\n${extracted.verwendungsbereich}`
      : null,
    extracted.physicalMarking
      ? `Kennzeichnung: ${extracted.physicalMarking}`
      : null,
    inspectionNote,
  ]
    .filter(Boolean)
    .join("\n");

  return normalizeTextParseResult({
    vendor: extracted.partType ?? extracted.partCategory,
    date: null,
    amount: null,
    category: "abe",
    summary:
      partLabel !== null
        ? `Teilegutachten · ${partLabel}`.slice(0, 80)
        : "Teilegutachten §19.3",
    lineItems: null,
    kbaNumber: extracted.certificateNumber,
    vehicleApprovals: extracted.matchedVehicleRow
      ? [extracted.matchedVehicleRow]
      : null,
    authority: extracted.testingOrganization,
    conditions: extracted.auflagen,
    partCategory: extracted.partCategory,
    notes: matchNotes || null,
    manufacturer: extracted.manufacturer,
    invoiceNumber: extracted.certificateNumber,
    mileageKm: null,
  });
}
