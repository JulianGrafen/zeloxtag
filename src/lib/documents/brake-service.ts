/**
 * Brake pad / brake service detection and interval records.
 */

import type { BrakeServiceRecord } from "@/components/vehicle-dashboard/brakeServiceRecords";
import { mergeServiceDueDates, toDisplayDate } from "@/lib/maintenance/service-due";
import { extractServicePartNumberFromLineItems } from "@/lib/ocr/extract-service-part-number";
import {
  estimateKmPerDayFromDocuments,
  latestKnownMileageKm,
} from "@/lib/vehicles/mileage-velocity";
import type { Document } from "@/types/database";

import { isManualVehicleEntry, MANUAL_SERVICE_ENTRY_LABELS } from "./manual-entries";

export const DEFAULT_BRAKE_INTERVAL_KM = 40_000;
export const DEFAULT_BRAKE_INTERVAL_MONTHS = 24;

const BRAKE_INVOICE =
  /(?:^|[^a-z0-9])(?:bremsbel|bremsscheib|bremsklotz|brake\s*pad|brake\s*disc)(?:[^a-z0-9]|$)/i;

export function isBrakeServiceDocument(document: Document): boolean {
  if (isManualVehicleEntry(document)) {
    const title = document.title?.trim() ?? "";
    if (title === MANUAL_SERVICE_ENTRY_LABELS.brakes) return true;
    if (/brems/i.test(title)) return true;
    return false;
  }

  const blob = [
    document.title,
    document.vendor,
    document.category,
    document.notes,
    ...(document.line_items ?? []).map((item) => item.label),
  ]
    .filter(Boolean)
    .join("\n");

  return BRAKE_INVOICE.test(blob);
}

export function filterBrakeServiceDocuments(documents: Document[]): Document[] {
  return documents
    .filter(isBrakeServiceDocument)
    .sort((a, b) => {
      const aDate = a.date ?? a.created_at;
      const bDate = b.date ?? b.created_at;
      return bDate.localeCompare(aDate);
    });
}

export function brakeServiceRecordListSubtitle(record: BrakeServiceRecord): string {
  const parts: string[] = [];
  if (record.workshop) parts.push(record.workshop);
  parts.push(`${record.mileageKm.toLocaleString("de-DE")} km`);
  if (record.partNumber) parts.push(`Teile-Nr. ${record.partNumber}`);
  return parts.join(" · ");
}

export function brakeServiceRecordsFromDocuments(
  documents: Document[],
  options: {
    intervalKm?: number;
    intervalMonths?: number;
    kmPerDay?: number | null;
  } = {},
): BrakeServiceRecord[] {
  const intervalKm = options.intervalKm ?? DEFAULT_BRAKE_INTERVAL_KM;
  const intervalMonths = options.intervalMonths ?? DEFAULT_BRAKE_INTERVAL_MONTHS;
  const kmPerDay =
    options.kmPerDay ?? estimateKmPerDayFromDocuments(documents);
  const latestKm = latestKnownMileageKm(documents);
  const brakeDocs = filterBrakeServiceDocuments(documents);

  return brakeDocs.map((document, index) => {
    const isoDate = document.date ?? document.created_at.slice(0, 10);
    const mileageKm =
      typeof document.mileage_km === "number" ? document.mileage_km : 0;
    const nextDueKm = mileageKm > 0 ? mileageKm + intervalKm : intervalKm;
    const merged = mergeServiceDueDates({
      lastServiceIsoDate: isoDate,
      intervalMonths,
      lastMileageKm: mileageKm,
      nextDueKm,
      latestKnownMileageKm: latestKm,
      kmPerDay,
    });
    const partNumber = extractServicePartNumberFromLineItems(
      document.line_items,
      "brake_pads",
    );

    return {
      id: document.id,
      date: toDisplayDate(isoDate),
      mileageKm,
      workshop: document.vendor?.trim() || null,
      intervalKm,
      intervalMonths,
      nextDueKm,
      nextDueDate: toDisplayDate(merged.nextDueDateIso),
      nextDueDateIso: merged.nextDueDateIso,
      kmBasedEstimate: merged.kmBasedEstimate,
      kmPerDay,
      partNumber,
      notes: document.notes?.trim() ?? "",
      invoiceRef: document.id,
      status: index === 0 ? "aktuell" : "erledigt",
      isManual: isManualVehicleEntry(document),
    } satisfies BrakeServiceRecord;
  });
}
