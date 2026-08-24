import { z } from "zod";

import type { ApprovalFields } from "@/lib/documents/approval-fields";
import {
  isPlausibleVehicleApproval,
  normalizeAbeDate,
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
  TEILEGUTACHTEN_COMPATIBILITY_CELL_MAX,
  TEILEGUTACHTEN_COMPATIBILITY_HEADER_MAX,
  vehicleApprovalsFromSanitizedTable,
} from "@/lib/validations/teilegutachten-compatibility-table";
import {
  sanitizeTeilegutachtenTechnicalTable,
  technicalSpecsFromTeilegutachtenTable,
} from "@/lib/validations/teilegutachten-technical-data";
import { groupTeilegutachtenAuflagen } from "@/lib/validations/teilegutachten-auflagen";
import {
  normalizeTeilegutachtenOwnerNotes,
  TEILEGUTACHTEN_OWNER_NOTES_MAX_LENGTH,
} from "@/lib/ocr/teilegutachten-owner-notes-from-text";
import { normalizeTeilegutachtenMarking } from "@/lib/ocr/teilegutachten-marking-from-text";
import {
  normalizeTeilegutachtenModificationType,
  TEILEGUTACHTEN_MODIFICATION_TYPE_MAX_LENGTH,
} from "@/lib/ocr/teilegutachten-modification-type-from-text";

export { TEILEGUTACHTEN_MODIFICATION_TYPE_MAX_LENGTH };
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
    /** Ausstellungs-/Gutachtendatum from the document header (YYYY-MM-DD). */
    issueDate: z.string().trim().min(1).max(32).nullable(),
    manufacturer: z.string().trim().min(1).max(120).nullable(),
    /** Part family, e.g. "Sonderfahrwerksfedern". */
    partCategory: z.string().trim().min(1).max(120).nullable(),
    /** Art der Umrüstung — full header block, may span multiple lines. */
    modificationType: z
      .string()
      .trim()
      .min(1)
      .max(TEILEGUTACHTEN_MODIFICATION_TYPE_MAX_LENGTH)
      .nullable(),
    /** Exact part type / model id, e.g. "Eibach 21-85-041-01-VA". */
    partType: z.string().trim().min(1).max(160).nullable(),
    /**
     * Kennzeichnung — how the part is physically marked on the component.
     * CRITICAL for the mandatory Anbauabnahme inspection.
     * @deprecated Prefer {@link markingType} + {@link markingNumber}; kept for LLM fallback.
     */
    physicalMarking: z.string().trim().min(1).max(500).nullable(),
    /** Art der Kennzeichnung, e.g. "Aufdruck", "Eingegossen", "Typenschild". */
    markingType: z.string().trim().min(1).max(200).nullable(),
    /** Kennzeichnungsnummer / Nummer on the part, e.g. "e1*47656". */
    markingNumber: z.string().trim().min(1).max(120).nullable(),
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
    /** Section III — Hinweise für den Fahrzeughalter (verbatim). */
    ownerNotes: z
      .string()
      .trim()
      .min(1)
      .max(TEILEGUTACHTEN_OWNER_NOTES_MAX_LENGTH)
      .nullable(),
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
    issueDate: z.string().trim().min(1).max(32).nullable(),
    manufacturer: z.string().trim().min(1).max(120).nullable(),
    partCategory: z.string().trim().min(1).max(120).nullable(),
    modificationType: z
      .string()
      .trim()
      .min(1)
      .max(TEILEGUTACHTEN_MODIFICATION_TYPE_MAX_LENGTH)
      .nullable(),
    partType: z.string().trim().min(1).max(160).nullable(),
    physicalMarking: z.string().trim().min(1).max(500).nullable(),
    markingType: z.string().trim().min(1).max(200).nullable(),
    markingNumber: z.string().trim().min(1).max(120).nullable(),
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
    /** Section III — Hinweise für den Fahrzeughalter (verbatim). */
    ownerNotes: z
      .string()
      .trim()
      .min(1)
      .max(TEILEGUTACHTEN_OWNER_NOTES_MAX_LENGTH)
      .nullable(),
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
      "issueDate",
      "manufacturer",
      "partCategory",
      "modificationType",
      "partType",
      "physicalMarking",
      "markingType",
      "markingNumber",
      "requiresPhysicalInspection",
      "testingOrganization",
      "userVehicleMatchStatus",
      "verwendungsbereich",
      "auflagen",
      "ownerNotes",
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
      issueDate: {
        type: ["string", "null"],
        description:
          'Ausstellungs-/Gutachtendatum from the document header as YYYY-MM-DD (e.g. "2021-03-15"). Not the upload/scan date.',
      },
      manufacturer: {
        type: ["string", "null"],
        description: 'Part manufacturer / Herstellerzeichen.',
      },
      partCategory: {
        type: ["string", "null"],
        description:
          'Optional Bauteil / Bezeichnung, e.g. "Frontspoiler", "Sportauspuff".',
      },
      modificationType: {
        type: ["string", "null"],
        description:
          'Art der Umrüstung from the document header — copy the COMPLETE block verbatim, including every listed modification when multiple lines or bullet points appear. Preserve line breaks. Do NOT truncate or summarize.',
      },
      partType: {
        type: ["string", "null"],
        description:
          'Exact part type / model id, e.g. "Eibach 21-85-041-01-VA".',
      },
      physicalMarking: {
        type: ["string", "null"],
        description:
          'Legacy combined Kennzeichnung text. Prefer markingType + markingNumber.',
      },
      markingType: {
        type: ["string", "null"],
        description:
          'Art der Kennzeichnung — verbatim, e.g. "Aufdruck", "Eingegossen", "Typenschild", "Aufdruck auf den Federwindungen". CRITICAL.',
      },
      markingNumber: {
        type: ["string", "null"],
        description:
          'Kennzeichnungsnummer / Nummer on the part, e.g. "e1*47656", "14-00123-CP-GBM". CRITICAL.',
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
          'Section IV "Hinweise und Auflagen". When IV.1, IV.2, … subsections exist: one array item per subsection with heading plus verbatim numbered body. Otherwise one item per colon-heading section.',
        items: { type: "string" },
      },
      ownerNotes: {
        type: ["string", "null"],
        description:
          'Section III / "Hinweise für den Fahrzeughalter" — copy verbatim from the document. Preserve line breaks and full sentences. Do NOT summarize. Null if absent.',
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
          "Structured Verwendungsbereich table copied 1:1 from the document. Preserve ALL original headers and full cell text for every column (including Ausführungen, Achslasten, ABE-Nr., footnotes). Match flags are applied server-side.",
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
    headers: table.headers.map((header) =>
      header.trim().slice(0, TEILEGUTACHTEN_COMPATIBILITY_HEADER_MAX),
    ),
    rows: table.rows.map((row) => ({
      id: row.id.trim().slice(0, 80),
      cells: row.cells.map((cell) =>
        cell
          .replace(/\r\n/g, "\n")
          .trimEnd()
          .slice(0, TEILEGUTACHTEN_COMPATIBILITY_CELL_MAX),
      ),
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
  const marking = normalizeTeilegutachtenMarking({
    markingType: fields.markingType,
    markingNumber: fields.markingNumber,
    physicalMarking: fields.physicalMarking,
  });

  const normalized: TeilegutachtenExtraction = {
    documentType: "Teilegutachten",
    certificateNumber: normalizeOptionalText(fields.certificateNumber, 120),
    issueDate: normalizeAbeDate(fields.issueDate),
    manufacturer: normalizeOptionalText(fields.manufacturer, 120),
    partCategory: normalizeOptionalText(fields.partCategory, 120),
    modificationType: normalizeTeilegutachtenModificationType(
      fields.modificationType,
    ),
    partType: normalizeOptionalText(fields.partType, 160),
    markingType: marking.markingType,
    markingNumber: marking.markingNumber,
    physicalMarking: marking.physicalMarking,
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
    ownerNotes: normalizeTeilegutachtenOwnerNotes(fields.ownerNotes),
  };

  return TeilegutachtenExtractionSchema.parse(normalized);
}

export function emptyTeilegutachtenLlmPayload(): TeilegutachtenLlmPayload {
  return {
    documentType: "Teilegutachten",
    certificateNumber: null,
    issueDate: null,
    manufacturer: null,
    partCategory: null,
    modificationType: null,
    partType: null,
    physicalMarking: null,
    markingType: null,
    markingNumber: null,
    requiresPhysicalInspection: true,
    testingOrganization: null,
    userVehicleMatchStatus: null,
    verwendungsbereich: null,
    auflagen: null,
    ownerNotes: null,
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

/** Review form state → extraction shape (for syncing Freigaben from tables). */
export type TeilegutachtenReviewSource = {
  certificateNumber: string | null;
  issueDate: string | null;
  manufacturer: string | null;
  partCategory: string | null;
  modificationType: string | null;
  partType: string | null;
  markingType: string | null;
  markingNumber: string | null;
  physicalMarking: string | null;
  testingOrganization: string | null;
  userVehicleMatchStatus: TeilegutachtenExtraction["userVehicleMatchStatus"];
  matchedVehicleRow: string | null;
  compatibilityTable: TableData | null;
  technicalDataTable: TableData | null;
  ownerNotes: string | null;
  verwendungsbereich: string | null;
  auflagen: string[] | null;
};

export function teilegutachtenReviewToExtraction(
  review: TeilegutachtenReviewSource,
): TeilegutachtenExtraction {
  const marking = normalizeTeilegutachtenMarking({
    markingType: review.markingType,
    markingNumber: review.markingNumber,
    physicalMarking: review.physicalMarking,
  });

  return {
    documentType: "Teilegutachten",
    certificateNumber: review.certificateNumber?.trim() || null,
    issueDate: normalizeAbeDate(review.issueDate),
    manufacturer: review.manufacturer?.trim() || null,
    partCategory: review.partCategory?.trim() || null,
    modificationType: normalizeTeilegutachtenModificationType(
      review.modificationType,
    ),
    partType: review.partType?.trim() || null,
    markingType: marking.markingType,
    markingNumber: marking.markingNumber,
    physicalMarking: marking.physicalMarking,
    requiresPhysicalInspection: true,
    testingOrganization: review.testingOrganization?.trim() || null,
    userVehicleMatchStatus: review.userVehicleMatchStatus,
    verwendungsbereich: review.verwendungsbereich?.trim() || null,
    auflagen: review.auflagen,
    matchedVehicleRow: review.matchedVehicleRow?.trim() || null,
    compatibilityTable: review.compatibilityTable,
    technicalDataTable: review.technicalDataTable,
    ownerNotes: review.ownerNotes?.trim() || null,
  };
}

export function resolveTeilegutachtenReviewVehicleApprovals(
  review: TeilegutachtenReviewSource & {
    vehicleApprovals?: string[] | null;
  },
): string[] | null {
  if (review.vehicleApprovals?.length) {
    return normalizeAbeVehicleApprovals(review.vehicleApprovals);
  }
  return teilegutachtenVehicleApprovals(teilegutachtenReviewToExtraction(review));
}

function formatMarkingSummary(extracted: TeilegutachtenExtraction): string | null {
  if (extracted.markingType || extracted.markingNumber) {
    return [
      extracted.markingType
        ? `Art der Kennzeichnung: ${extracted.markingType}`
        : null,
      extracted.markingNumber
        ? `Kennzeichnungsnummer: ${extracted.markingNumber}`
        : null,
    ]
      .filter(Boolean)
      .join("\n");
  }

  return extracted.physicalMarking
    ? `Kennzeichnung: ${extracted.physicalMarking}`
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
    formatMarkingSummary(extracted),
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
    ownerNotes: extracted.ownerNotes ?? null,
    markingType: extracted.markingType,
    markingNumber: extracted.markingNumber,
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
    [
      extracted.modificationType,
      extracted.partCategory,
      extracted.partType,
    ]
      .filter(Boolean)
      .join(" · ") || null;

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
    formatMarkingSummary(extracted),
    inspectionNote,
  ]
    .filter(Boolean)
    .join("\n");

  return normalizeTextParseResult({
    vendor: extracted.partType ?? extracted.partCategory,
    date: normalizeAbeDate(extracted.issueDate),
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
    partCategory:
      extracted.modificationType ?? extracted.partCategory ?? null,
    notes: matchNotes || null,
    manufacturer: extracted.manufacturer,
    invoiceNumber: extracted.certificateNumber,
    mileageKm: null,
  });
}
