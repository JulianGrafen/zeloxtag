import type { Document } from "@/types/database";
import type { VehicleInspectionInfo } from "@/components/vehicle-dashboard/types";
import { parseApprovalFields } from "@/lib/documents/approval-fields";

/** Passenger cars: HU interval after the first inspection (months). */
export const TUEV_INTERVAL_MONTHS = 24;

function documentSortKey(document: Document): string {
  return document.date ?? document.created_at.slice(0, 10);
}

/**
 * Latest TÜV / HU Prüfbericht for a vehicle.
 */
export function getLatestTuevDocument(
  documents: Document[],
): Document | null {
  const tuevDocs = documents.filter(
    (doc) => doc.type === "tuev" || doc.category === "tuev",
  );
  if (tuevDocs.length === 0) return null;

  return [...tuevDocs].sort((a, b) =>
    documentSortKey(b).localeCompare(documentSortKey(a)),
  )[0];
}

/**
 * Next HU due date = last Prüfbericht date + 24 months.
 */
export function nextTuevDateFromReportDate(reportDateIso: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(reportDateIso)) return null;

  const [year, month, day] = reportDateIso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(date.getTime())) return null;

  date.setUTCMonth(date.getUTCMonth() + TUEV_INTERVAL_MONTHS);
  return date.toISOString().slice(0, 10);
}

/**
 * Convert YYYY-MM to ISO date, preserving day-of-month from a reference date when given.
 */
export function yearMonthToIsoDate(
  yearMonth: string,
  daySourceIso?: string | null,
): string | null {
  if (!/^\d{4}-\d{2}$/.test(yearMonth)) return null;
  const [year, month] = yearMonth.split("-").map(Number);
  if (!year || !month || month < 1 || month > 12) return null;

  let day = 1;
  if (daySourceIso && /^\d{4}-\d{2}-\d{2}$/.test(daySourceIso)) {
    day = Number.parseInt(daySourceIso.slice(8, 10), 10);
    const maxDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    day = Math.min(Math.max(1, day), maxDay);
  }

  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Dashboard `nextInspection` derived from the newest TÜV document.
 */
export function deriveNextInspectionFromDocuments(
  documents: Document[],
): VehicleInspectionInfo | undefined {
  const latest = getLatestTuevDocument(documents);
  if (!latest) return undefined;

  const approvalFields = parseApprovalFields(latest.approval_fields);
  if (approvalFields?.kind === "tuev") {
    const testDate = approvalFields.data.testDate?.trim() ?? null;

    // Primary: Prüfdatum + 24 months (same calendar day).
    if (testDate && /^\d{4}-\d{2}-\d{2}$/.test(testDate)) {
      const nextFromTest = nextTuevDateFromReportDate(testDate);
      if (nextFromTest) return { nextDate: nextFromTest };
    }

    const nextInspectionRaw = approvalFields.data.nextInspectionDate?.trim();
    if (nextInspectionRaw && /^\d{4}-\d{2}-\d{2}$/.test(nextInspectionRaw)) {
      return { nextDate: nextInspectionRaw };
    }
    if (nextInspectionRaw && /^\d{4}-\d{2}$/.test(nextInspectionRaw)) {
      const daySource =
        testDate && /^\d{4}-\d{2}-\d{2}$/.test(testDate)
          ? testDate
          : latest.date ?? latest.created_at.slice(0, 10);
      const nextDate = yearMonthToIsoDate(nextInspectionRaw, daySource);
      if (nextDate) return { nextDate };
    }
  }

  const reportDate =
    approvalFields?.kind === "tuev" &&
    approvalFields.data.testDate?.trim() &&
    /^\d{4}-\d{2}-\d{2}$/.test(approvalFields.data.testDate.trim())
      ? approvalFields.data.testDate.trim()
      : latest.date ?? latest.created_at.slice(0, 10);
  const nextDate = nextTuevDateFromReportDate(reportDate);
  if (!nextDate) return undefined;

  return { nextDate };
}
