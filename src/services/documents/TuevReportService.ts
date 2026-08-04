import {
  TESTING_ORGANIZATIONS,
  TUEV_RESULTS,
  TuevReportSchema,
  type TestingOrganization,
  type TuevReport,
  type TuevResult,
} from "@/lib/validations/documentSchemas";

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

/**
 * Normalize noisy OCR / LLM payloads before Zod validation.
 * Missing optional fields become `null` instead of crashing later.
 */
export function sanitizeTuevPayload(
  rawJson: unknown,
): Record<string, unknown> {
  if (!isRecord(rawJson)) {
    return {
      testingOrganization: "other",
      testDate: null,
      result: null,
      mileageKm: null,
      nextInspectionDate: null,
      documentNumber: null,
      defectsList: null,
    };
  }

  return {
    testingOrganization: normalizeTestingOrganization(
      rawJson.testingOrganization,
    ),
    testDate: normalizeIsoDate(rawJson.testDate),
    result: normalizeResult(rawJson.result),
    mileageKm: normalizeMileageKm(rawJson.mileageKm),
    nextInspectionDate: normalizeYearMonth(rawJson.nextInspectionDate),
    documentNumber: normalizeDocumentNumber(rawJson.documentNumber),
    defectsList: normalizeDefectsList(rawJson.defectsList),
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
        console.error("[TuevReportService] validation failed", error.toJSON());
      }
      throw error;
    }
  }
}
