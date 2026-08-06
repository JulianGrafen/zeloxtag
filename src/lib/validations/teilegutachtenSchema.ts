import { z } from "zod";

import type { ApprovalFields } from "@/lib/documents/approval-fields";
import {
  isPlausibleVehicleApproval,
  normalizeAbeVehicleApprovals,
} from "@/lib/ocr/abe-parse-schema";
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
import {
  looksLikeVerwendungsbereichTableDump,
  sanitizeTeilegutachtenCompatibilityTable,
  vehicleApprovalsFromSanitizedTable,
} from "@/lib/validations/teilegutachten-compatibility-table";
import {
  sanitizeTeilegutachtenTechnicalTable,
  technicalSpecsFromTeilegutachtenTable,
} from "@/lib/validations/teilegutachten-technical-data";
import { groupTeilegutachtenAuflagen } from "@/lib/validations/teilegutachten-auflagen";

export const TEILEGUTACHTEN_AUFLAGEN_MAX_LENGTH = 2_400;

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
      .array(z.string().trim().min(1).max(TEILEGUTACHTEN_AUFLAGEN_MAX_LENGTH))
      .max(40)
      .nullable(),
    /** @deprecated LLM alias — mapped to {@link auflagen}. */
    matchedConditions: z
      .array(z.string().trim().min(1).max(TEILEGUTACHTEN_AUFLAGEN_MAX_LENGTH))
      .max(40)
      .nullable()
      .optional(),
    matchedVehicleRow: z.string().trim().min(1).max(500).nullable(),
    compatibilityTable: TableDataSchema.nullable().optional(),
    /** Section II / Technische Daten — structured table. */
    technicalDataTable: TableDataSchema.nullable().optional(),
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
      .array(z.string().trim().min(1).max(TEILEGUTACHTEN_AUFLAGEN_MAX_LENGTH))
      .max(40)
      .nullable(),
    matchedVehicleRow: z.string().trim().min(1).max(500).nullable(),
    compatibilityTable: TableDataSchema.nullable().optional(),
    /** Section II / Technische Daten — structured table. */
    technicalDataTable: TableDataSchema.nullable().optional(),
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
      "technicalDataTable",
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
          "Optional short Verwendungsbereich summary when NO compatibilityTable is filled. Null when compatibilityTable is present — do NOT paste pipe/markdown table text here.",
      },
      auflagen: {
        type: ["array", "null"],
        description:
          "Auflagen sections. ONE array item per section: heading line ending with ':' plus all following paragraphs until the next heading. Never put headings and body text in separate items.",
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
          "Structured Verwendungsbereich table. Include ONLY vehicle columns: Fahrzeughersteller, Fahrzeugtyp, Handelsbezeichnung. Omit Achslasten, ABE-Nr, Ausführungen, footnotes. Match flags are applied server-side.",
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
      technicalDataTable: {
        type: ["object", "null"],
        additionalProperties: false,
        required: ["headers", "rows", "caption"],
        description:
          "Section II / Technische Daten as a structured table. Preserve full cell text (dimensions, part numbers, test values). Do NOT merge into Auflagen or Verwendungsbereich.",
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
  const grouped = groupTeilegutachtenAuflagen(values)
    .map((value) => value.trim().slice(0, TEILEGUTACHTEN_AUFLAGEN_MAX_LENGTH))
    .filter(Boolean)
    .slice(0, 40);
  return grouped.length > 0 ? grouped : null;
}

function normalizeVerwendungsbereich(
  value: string | null | undefined,
): string | null {
  if (!value) return null;
  if (looksLikeVerwendungsbereichTableDump(value)) return null;
  const trimmed = value
    .trim()
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n")
    .slice(0, 2_000);
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
    compatibilityTable: sanitizeTeilegutachtenCompatibilityTable(
      normalizeCompatibilityTable(fields.compatibilityTable),
    ),
    technicalDataTable: sanitizeTeilegutachtenTechnicalTable(
      normalizeCompatibilityTable(fields.technicalDataTable),
    ),
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
    technicalDataTable: null,
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

function vehicleApprovalsFromVerwendungsbereich(
  text: string | null | undefined,
): string[] | null {
  if (!text?.trim() || looksLikeVerwendungsbereichTableDump(text)) return null;

  const raw: string[] = [];
  for (const line of text.split(/\n+/)) {
    const trimmed = line.trim().replace(/^[-•*]\s*/, "").replace(/\.$/, "");
    if (!trimmed || looksLikeVerwendungsbereichTableDump(trimmed)) continue;
    if (isPlausibleVehicleApproval(trimmed)) {
      raw.push(trimmed);
    }
  }

  return normalizeAbeVehicleApprovals(raw);
}

/** @deprecated Use {@link vehicleApprovalsFromSanitizedTable}. */
export function vehicleApprovalsFromCompatibilityTable(
  table: TableData,
): string[] | null {
  return vehicleApprovalsFromSanitizedTable(table);
}

/** All Fahrzeugfreigaben from TGA extract (table → clean lines → Trefferzeile). */
export function teilegutachtenVehicleApprovals(
  extracted: TeilegutachtenExtraction,
): string[] | null {
  const fromTable = vehicleApprovalsFromSanitizedTable(
    extracted.compatibilityTable,
  );
  if (fromTable?.length) return fromTable;

  const fromText = vehicleApprovalsFromVerwendungsbereich(
    extracted.verwendungsbereich,
  );
  if (fromText?.length) return fromText;

  return extracted.matchedVehicleRow
    ? normalizeAbeVehicleApprovals([extracted.matchedVehicleRow])
    : null;
}

function buildValidityArea(extracted: TeilegutachtenExtraction): string {
  const parts = [
    extracted.compatibilityTable?.rows.length
      ? "Fahrzeugfreigaben siehe Tabelle."
      : extracted.verwendungsbereich,
    extracted.matchedVehicleRow &&
    extracted.matchedVehicleRow !== extracted.verwendungsbereich
      ? `Fahrzeugzeile: ${extracted.matchedVehicleRow}`
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

/** Strip legacy embedded Auflagen blocks from stored validityArea text. */
export function stripAuflagenFromValidityArea(
  validityArea: string | null | undefined,
): string | null {
  if (!validityArea?.trim()) return null;
  const stripped = validityArea.replace(/\n\nAuflagen:[\s\S]*/i, "").trim();
  return stripped.length > 0 ? stripped : null;
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
    compatibilityTable: extracted.compatibilityTable ?? null,
    technicalDataTable: extracted.technicalDataTable ?? null,
  };
  return { kind: "teilegutachten", data };
}

/** Map TGA Technische Daten table → `documents.technical_specs`. */
export function teilegutachtenTechnicalSpecs(
  extracted: TeilegutachtenExtraction,
) {
  return technicalSpecsFromTeilegutachtenTable(extracted.technicalDataTable);
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
    extracted.verwendungsbereich &&
    !looksLikeVerwendungsbereichTableDump(extracted.verwendungsbereich)
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
    vehicleApprovals: teilegutachtenVehicleApprovals(extracted),
    authority: extracted.testingOrganization,
    conditions: extracted.auflagen,
    partCategory: extracted.partCategory,
    notes: matchNotes || null,
    manufacturer: extracted.manufacturer,
    invoiceNumber: extracted.certificateNumber,
    mileageKm: null,
  });
}
