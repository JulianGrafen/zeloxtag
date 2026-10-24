import {
  detectOilChangeInvoice,
  filterOilChangeDocuments,
  resolveOilChangeInterval,
} from "@/lib/documents/oil-changes";
import {
  filterBrakeServiceDocuments,
  inferBrakeCategoryFromDocument,
  isBrakeServiceDocument,
} from "@/lib/documents/brake-service";
import { mergeServiceDueDates } from "@/lib/maintenance/service-due";
import {
  estimateKmPerDayFromDocuments,
  latestKnownMileageKm,
} from "@/lib/vehicles/mileage-velocity";
import type { VehicleTechSpecs } from "@/lib/vehicles/tech-specs";
import type { Document } from "@/types/database";

import { serviceCategoryPreset } from "./category-presets";
import type { ServiceRecord, ServiceRecordCategory } from "./service-record";

function serviceDateFromDocument(document: Document): string {
  return document.date?.slice(0, 10) ?? document.created_at.slice(0, 10);
}

function buildLegacyRecord(
  document: Document,
  category: ServiceRecordCategory,
  options: {
    title: string;
    nextIntervalMileage: number | null;
    nextIntervalDate: string | null;
  },
): ServiceRecord {
  const isoDate = serviceDateFromDocument(document);
  const mileage =
    typeof document.mileage_km === "number" ? document.mileage_km : 0;

  return {
    id: document.id,
    vehicleId: document.vehicle_id,
    category,
    title: options.title,
    date: isoDate,
    mileage,
    performedBy: document.vendor?.trim() || null,
    notes: document.notes?.trim() || null,
    invoiceDocumentId: document.id,
    nextIntervalMileage: options.nextIntervalMileage,
    nextIntervalDate: options.nextIntervalDate,
    showOnPublicShowcase: document.show_on_public_showcase === true,
    createdAt: document.created_at,
    updatedAt: document.created_at,
    source: "legacy_document",
  };
}

export function legacyServiceRecordsFromDocuments(
  documents: Document[],
  specs?: Pick<
    VehicleTechSpecs,
    "oilChangeIntervalKm" | "oilChangeIntervalMonths"
  > | null,
  linkedDocumentIds: ReadonlySet<string> = new Set(),
): ServiceRecord[] {
  const oilInterval = resolveOilChangeInterval(specs);
  const kmPerDay = estimateKmPerDayFromDocuments(documents);
  const latestKm = latestKnownMileageKm(documents);
  const records: ServiceRecord[] = [];

  for (const document of filterOilChangeDocuments(documents)) {
    if (linkedDocumentIds.has(document.id)) continue;

    const detected = detectOilChangeInvoice({
      title: document.title,
      vendor: document.vendor,
      category: document.category,
      notes: document.notes,
      lineItems: document.line_items,
    });
    const isoDate = serviceDateFromDocument(document);
    const mileage =
      typeof document.mileage_km === "number" ? document.mileage_km : 0;
    const preset = serviceCategoryPreset("oil_change", specs);
    const nextDueKm =
      mileage > 0 ? mileage + preset.intervalKm : preset.intervalKm;
    const merged = mergeServiceDueDates({
      lastServiceIsoDate: isoDate,
      intervalMonths: preset.intervalMonths,
      lastMileageKm: mileage,
      nextDueKm,
      latestKnownMileageKm: latestKm,
      kmPerDay,
    });

    records.push(
      buildLegacyRecord(document, "oil_change", {
        title: document.title?.trim() || detected.title || "Ölwechsel",
        nextIntervalMileage: nextDueKm,
        nextIntervalDate: merged.nextDueDateIso,
      }),
    );
  }

  for (const document of filterBrakeServiceDocuments(documents)) {
    if (linkedDocumentIds.has(document.id)) continue;
    if (!isBrakeServiceDocument(document)) continue;

    const category = inferBrakeCategoryFromDocument(document);
    const isoDate = serviceDateFromDocument(document);
    const mileage =
      typeof document.mileage_km === "number" ? document.mileage_km : 0;
    const preset = serviceCategoryPreset(category);
    const nextDueKm =
      mileage > 0 ? mileage + preset.intervalKm : preset.intervalKm;
    const merged = mergeServiceDueDates({
      lastServiceIsoDate: isoDate,
      intervalMonths: preset.intervalMonths,
      lastMileageKm: mileage,
      nextDueKm,
      latestKnownMileageKm: latestKm,
      kmPerDay,
    });

    records.push(
      buildLegacyRecord(document, category, {
        title: document.title?.trim() || preset.defaultTitle,
        nextIntervalMileage: nextDueKm,
        nextIntervalDate: merged.nextDueDateIso,
      }),
    );
  }

  return records.sort((a, b) => {
    const dateCmp = b.date.localeCompare(a.date);
    if (dateCmp !== 0) return dateCmp;
    return b.createdAt.localeCompare(a.createdAt);
  });
}

export function mergeServiceHistory(
  databaseRecords: ServiceRecord[],
  legacyRecords: ServiceRecord[],
): ServiceRecord[] {
  const linked = new Set(
    databaseRecords
      .map((r) => r.invoiceDocumentId)
      .filter((id): id is string => Boolean(id)),
  );
  const legacyFiltered = legacyRecords.filter(
    (r) =>
      !r.invoiceDocumentId || !linked.has(r.invoiceDocumentId),
  );
  return [...databaseRecords, ...legacyFiltered].sort((a, b) => {
    const dateCmp = b.date.localeCompare(a.date);
    if (dateCmp !== 0) return dateCmp;
    return b.createdAt.localeCompare(a.createdAt);
  });
}
