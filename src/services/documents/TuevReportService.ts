import {
  TESTING_ORGANIZATIONS,
  TUEV_RESULTS,
  TuevDefectRowSchema,
  TuevReportSchema,
  type TestingOrganization,
  type TuevDefectRow,
  type TuevReport,
  type TuevResult,
} from "@/lib/validations/documentSchemas";
import {
  defectsListFromTuevDefectRows,
  normalizeCheckpoint,
  parseTuevDefectLine,
} from "@/lib/ocr/tuev-defects-from-text";

import { BaseDocumentService } from "./BaseDocumentService";
import { DocumentValidationError } from "./DocumentValidationError";

const MAX_MILEAGE_KM = 9_999_999;
const MAX_DOCUMENT_NUMBER = 120;
const MAX_DEFECT_LENGTH = 500;
const MAX_DEFECTS = 80;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeTestingOrganization(value: unknown): TestingOrganization {
  if (
    typeof value === "string" &&
    (TESTING_ORGANIZATIONS as readonly string[]).includes(value)
  ) {
    return value as TestingOrganization;
  }

  const folded = asTrimmedString(value)
    ?.normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();

  if (!folded) return "other";
  if (/\bdekra\b/.test(folded)) return "DEKRA";
  if (/\bgtue\b|\bgtu\b/.test(folded)) return "GTÜ";
  if (/\bkues\b|\bkus\b/.test(folded)) return "KÜS";
  if (/\btuv\b|\btuev\b/.test(folded)) return "TÜV";
  return "other";
}

function isValidCalendarDate(iso: string): boolean {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return false;
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  if (y < 1980 || y > 2100) return false;
  const date = new Date(Date.UTC(y, m - 1, d));
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d
  );
}

function normalizeIsoDate(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return isValidCalendarDate(trimmed) ? trimmed : null;
  }

  const de = trimmed.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
  if (!de) return null;
  const day = Number.parseInt(de[1]!, 10);
  const month = Number.parseInt(de[2]!, 10);
  const year = Number.parseInt(de[3]!, 10);
  const iso = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return isValidCalendarDate(iso) ? iso : null;
}

function normalizeYearMonth(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (/^\d{4}-\d{2}$/.test(trimmed)) {
    const [y, m] = trimmed.split("-").map(Number);
    if (!y || !m || m < 1 || m > 12 || y < 1980 || y > 2100) return null;
    return trimmed;
  }

  const de = trimmed.match(/^(\d{1,2})[./-](\d{4})$/);
  if (!de) return null;
  const month = Number.parseInt(de[1]!, 10);
  const year = Number.parseInt(de[2]!, 10);
  if (month < 1 || month > 12 || year < 1980 || year > 2100) return null;
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}`;
}

function normalizeMileageKm(value: unknown): number | null {
  if (value == null || value === "") return null;

  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    const rounded = Math.round(value);
    if (rounded < 0 || rounded > MAX_MILEAGE_KM) return null;
    return rounded;
  }

  if (typeof value !== "string") return null;
  const digits = value
    .replace(/\s/g, "")
    .replace(/km$/i, "")
    .replace(/\./g, "")
    .replace(/,/g, "")
    .replace(/[^\d]/g, "");
  if (!digits) return null;
  const parsed = Number.parseInt(digits, 10);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > MAX_MILEAGE_KM) {
    return null;
  }
  return parsed;
}

function normalizeResult(value: unknown): TuevResult | null {
  if (
    typeof value === "string" &&
    (TUEV_RESULTS as readonly string[]).includes(value)
  ) {
    return value as TuevResult;
  }

  const folded = asTrimmedString(value)
    ?.normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
  if (!folded) return null;

  // "ohne erhebliche Mängel" must win before bare "erhebliche Mängel".
  if (
    /\bohne\s+(?:erhebliche\s+)?mangel\b/.test(folded) ||
    /\bkeine\s+mangel\b/.test(folded) ||
    /\bmangelfrei\b/.test(folded)
  ) {
    return "no_defects";
  }
  if (
    /\bnicht\s+bestanden\b/.test(folded) ||
    /\bdurchgefallen\b/.test(folded)
  ) {
    return "failed";
  }
  if (/\bgefahrliche\s+mangel\b/.test(folded)) {
    return "dangerous_defects";
  }
  if (/\berhebliche\s+mangel\b/.test(folded)) {
    return "major_defects";
  }
  if (/\bgering(?:f(?:ue|u)?gig)?e?\s+mangel\b/.test(folded)) {
    return "minor_defects";
  }

  return null;
}

function normalizeDocumentNumber(value: unknown): string | null {
  const trimmed = asTrimmedString(value);
  if (!trimmed) return null;
  return trimmed.slice(0, MAX_DOCUMENT_NUMBER);
}

function normalizeDefectsList(value: unknown): string[] | null {
  if (value == null) return null;

  const items: unknown[] = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/\n|;|\u2022|\u2023|\*/)
      : [];

  const cleaned = items
    .map((item) => asTrimmedString(item)?.slice(0, MAX_DEFECT_LENGTH) ?? null)
    .filter((item): item is string => Boolean(item))
    .slice(0, MAX_DEFECTS);

  return cleaned.length > 0 ? cleaned : null;
}

function normalizeDefectRow(row: TuevDefectRow): TuevDefectRow {
  let checkpoint = row.checkpoint
    ? normalizeCheckpoint(row.checkpoint.replace(/^-+\s*/, ""))
    : null;

  if (checkpoint) {
    const embeddedSeverity = row.checkpoint?.match(/\((EM|GM)\)\s*$/i);
    if (embeddedSeverity && !row.severity) {
      return {
        ...row,
        checkpoint,
        severity: embeddedSeverity[1]!.toUpperCase() as "EM" | "GM",
      };
    }
    return { ...row, checkpoint };
  }

  const parsed = parseTuevDefectLine(row.description);
  if (parsed?.checkpoint) {
    return {
      checkpoint: parsed.checkpoint,
      description: parsed.description,
      severity: row.severity ?? parsed.severity,
    };
  }

  const parsedCheckpoint = row.checkpoint
    ? parseTuevDefectLine(row.checkpoint)
    : null;
  if (parsedCheckpoint?.checkpoint) {
    return {
      checkpoint: parsedCheckpoint.checkpoint,
      description: row.description,
      severity: row.severity ?? parsedCheckpoint.severity,
    };
  }

  return { ...row, checkpoint: null };
}

/**
 * Checks whether `candidate` checkpoint is a likely OCR misread of `canonical`.
 * Handles the specific failure mode where one digit gets dropped from a segment
 * (e.g. '1.1.3a' is a misread of '1.1.13a' because '1' was dropped from '13').
 */
function isLikelyMisreadCheckpoint(candidate: string, canonical: string): boolean {
  const parseCheckpoint = (cp: string) => {
    const match = cp.match(/^(D)?(\d+(?:\.\d+)*)([a-d])?$/i);
    if (!match) return null;
    return {
      prefix: match[1] ?? "",
      segments: match[2]!.split("."),
      suffix: match[3]?.toLowerCase() ?? "",
    };
  };

  const cand = parseCheckpoint(candidate);
  const canon = parseCheckpoint(canonical);
  if (!cand || !canon) return false;
  if (cand.prefix !== canon.prefix || cand.suffix !== canon.suffix) return false;
  if (cand.segments.length !== canon.segments.length) return false;

  let diffCount = 0;
  for (let i = 0; i < cand.segments.length; i++) {
    const cs = cand.segments[i]!;
    const ks = canon.segments[i]!;
    if (cs === ks) continue;
    diffCount++;
    // Candidate segment must be a digit-truncated suffix of the canonical segment
    // e.g. cs='3', ks='13' → '13'.endsWith('3') and len(13) > len(3)
    if (!ks.endsWith(cs) || ks.length <= cs.length) return false;
  }

  return diffCount === 1;
}

/**
 * Remove checkpoint rows that are duplicates caused by an OCR misread — specifically
 * when a shorter checkpoint is a truncated version of a longer one in the same set.
 */
function removeMisreadDuplicates(rows: TuevDefectRow[]): TuevDefectRow[] {
  const checkpoints = [
    ...new Set(rows.map((r) => r.checkpoint).filter(Boolean) as string[]),
  ];

  const shadowed = new Set<string>();
  for (const candidate of checkpoints) {
    for (const canonical of checkpoints) {
      if (candidate !== canonical && isLikelyMisreadCheckpoint(candidate, canonical)) {
        shadowed.add(candidate);
      }
    }
  }

  if (shadowed.size === 0) return rows;
  return rows.filter((r) => !r.checkpoint || !shadowed.has(r.checkpoint));
}

function normalizeDefectsTable(value: unknown): TuevDefectRow[] | null {
  if (value == null) return null;
  if (!Array.isArray(value)) return null;

  const rows: TuevDefectRow[] = [];
  for (const item of value) {
    const parsed = TuevDefectRowSchema.safeParse(item);
    if (!parsed.success) continue;
    rows.push(normalizeDefectRow(parsed.data));
    if (rows.length >= MAX_DEFECTS) break;
  }

  const deduped = removeMisreadDuplicates(rows);
  return deduped.length > 0 ? deduped : null;
}

function resolveTuevDefects(
  defectsTable: unknown,
  defectsList: unknown,
): { defectsTable: TuevDefectRow[] | null; defectsList: string[] | null } {
  const table = normalizeDefectsTable(defectsTable);
  if (table?.length) {
    // Always regenerate the plain-text list from the deduplicated table so
    // misread checkpoints removed from the table are also absent from the list.
    return {
      defectsTable: table,
      defectsList: defectsListFromTuevDefectRows(table),
    };
  }

  const list = normalizeDefectsList(defectsList);
  if (!list?.length) {
    return { defectsTable: null, defectsList: null };
  }

  const parsedTable = list
    .map((entry) => parseTuevDefectLine(entry))
    .filter((row): row is TuevDefectRow => row != null);

  if (parsedTable.length > 0) {
    return {
      defectsTable: parsedTable,
      defectsList:
        normalizeDefectsList(defectsList) ??
        defectsListFromTuevDefectRows(parsedTable),
    };
  }

  // Plain-text Mängel without Prüfpunkt numbers.
  const plainTable = list.map((description) => ({
    checkpoint: null,
    description,
    severity: null,
  }));

  return {
    defectsTable: plainTable.length > 0 ? plainTable : null,
    defectsList: list,
  };
}

/**
 * Normalize noisy OCR / LLM payloads before Zod validation.
 * Non-objects are passed through so Zod reports a clear root error.
 * Missing optional fields become `null` instead of crashing later.
 */
export function sanitizeTuevPayload(rawJson: unknown): unknown {
  if (!isRecord(rawJson)) {
    return rawJson;
  }

  const defects = resolveTuevDefects(
    rawJson.defectsTable,
    rawJson.defectsList,
  );

  const result = normalizeResult(rawJson.result);
  const clearedDefects =
    result === "no_defects"
      ? { defectsTable: null, defectsList: null }
      : defects;

  return {
    testingOrganization: normalizeTestingOrganization(
      rawJson.testingOrganization,
    ),
    testDate: normalizeIsoDate(rawJson.testDate),
    result: normalizeResult(rawJson.result),
    mileageKm: normalizeMileageKm(rawJson.mileageKm),
    nextInspectionDate: normalizeYearMonth(rawJson.nextInspectionDate),
    documentNumber: normalizeDocumentNumber(rawJson.documentNumber),
    defectsTable: clearedDefects.defectsTable,
    defectsList: clearedDefects.defectsList,
  };
}

const EMPTY_TUEV_REPORT: TuevReport = {
  testingOrganization: "other",
  testDate: null,
  result: "no_defects",
  mileageKm: null,
  nextInspectionDate: null,
  documentNumber: null,
  defectsTable: null,
  defectsList: null,
};

export type TuevReportParseResult = {
  report: TuevReport;
  requiresManualReview: boolean;
};

/**
 * Parse sanitized LLM output with graceful degradation — never blocks the review UI
 * when optional fields are missing or partially invalid.
 */
export function parseTuevReportLenient(
  sanitized: unknown,
): TuevReportParseResult {
  const strict = TuevReportSchema.safeParse(sanitized);
  if (strict.success) {
    return { report: strict.data, requiresManualReview: false };
  }

  const record = isRecord(sanitized) ? sanitized : {};
  const resolvedDefects = resolveTuevDefects(
    record.defectsTable,
    record.defectsList,
  );
  const resolvedResult = normalizeResult(record.result) ?? "no_defects";
  const clearedDefects =
    resolvedResult === "no_defects"
      ? { defectsTable: null, defectsList: null }
      : resolvedDefects;

  const fallback = {
    ...EMPTY_TUEV_REPORT,
    testingOrganization: normalizeTestingOrganization(
      record.testingOrganization,
    ),
    testDate: normalizeIsoDate(record.testDate),
    result: resolvedResult,
    mileageKm: normalizeMileageKm(record.mileageKm),
    nextInspectionDate: normalizeYearMonth(record.nextInspectionDate),
    documentNumber: normalizeDocumentNumber(record.documentNumber),
    defectsTable: clearedDefects.defectsTable,
    defectsList: clearedDefects.defectsList,
    requiresManualReview: true,
  };

  const recovered = TuevReportSchema.safeParse(fallback);
  if (recovered.success) {
    return { report: recovered.data, requiresManualReview: true };
  }

  return {
    report: {
      ...EMPTY_TUEV_REPORT,
      testingOrganization: fallback.testingOrganization,
      requiresManualReview: true,
    },
    requiresManualReview: true,
  };
}

/**
 * Parser for HU / AU Prüfberichte (Haupt- und Abgasuntersuchung).
 */
export class TuevReportService extends BaseDocumentService<"tuev"> {
  readonly documentType = "tuev" as const;
  protected readonly schema = TuevReportSchema;

  override parseAndValidate(rawJson: unknown): TuevReport {
    const sanitized = sanitizeTuevPayload(rawJson);
    try {
      return super.parseAndValidate(sanitized);
    } catch (error) {
      if (error instanceof DocumentValidationError) {
        console.error(
          "[TuevReportService] validation failed",
          error.documentType,
          error.issues.map((issue) => issue.path).join(","),
        );
      }
      throw error;
    }
  }
}
