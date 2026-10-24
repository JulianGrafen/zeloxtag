import "server-only";

import {
  detectOilChangeInvoice,
  isOilChangeDocument,
  resolveOilChangeInterval,
} from "@/lib/documents/oil-changes";
import {
  inferBrakeCategoryFromDocument,
  isBrakeServiceDocument,
} from "@/lib/documents/brake-service";
import { mergeServiceDueDates } from "@/lib/maintenance/service-due";
import {
  estimateKmPerDayFromDocuments,
  latestKnownMileageKm,
} from "@/lib/vehicles/mileage-velocity";
import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { parseVehicleTechSpecs } from "@/lib/vehicles/tech-specs";
import type { Document, Vehicle } from "@/types/database";

import { computeNextIntervals, serviceCategoryPreset } from "./category-presets";
import type { ServiceRecordCategory } from "./service-record";

function serviceDateFromDocument(document: Document): string {
  return document.date?.slice(0, 10) ?? document.created_at.slice(0, 10);
}

export function detectServiceCategoryFromDocument(
  document: Document,
): ServiceRecordCategory | null {
  if (isOilChangeDocument(document)) return "oil_change";
  if (isBrakeServiceDocument(document)) {
    return inferBrakeCategoryFromDocument(document);
  }
  return null;
}

export function buildServiceRecordPayloadFromDocument(
  document: Document,
  documentsForVelocity: Document[],
  techSpecs?: Vehicle["tech_specs"],
): {
  category: ServiceRecordCategory;
  title: string;
  service_date: string;
  mileage_km: number;
  performed_by: string | null;
  notes: string | null;
  next_interval_mileage_km: number | null;
  next_interval_date: string | null;
  show_on_public_showcase: boolean;
} | null {
  const category = detectServiceCategoryFromDocument(document);
  if (!category) return null;

  const specs = parseVehicleTechSpecs(techSpecs);
  const isoDate = serviceDateFromDocument(document);
  const mileage =
    typeof document.mileage_km === "number" ? document.mileage_km : 0;

  let title = document.title?.trim() || serviceCategoryPreset(category, specs).defaultTitle;
  if (category === "oil_change") {
    const detected = detectOilChangeInvoice({
      title: document.title,
      vendor: document.vendor,
      category: document.category,
      notes: document.notes,
      lineItems: document.line_items,
    });
    title = document.title?.trim() || detected.title || "Ölwechsel";
  }

  const preset = serviceCategoryPreset(category, specs);
  const kmPerDay = estimateKmPerDayFromDocuments(documentsForVelocity);
  const latestKm = latestKnownMileageKm(documentsForVelocity);

  const { nextIntervalMileage, nextIntervalDate } = computeNextIntervals({
    category,
    serviceDate: isoDate,
    mileageKm: mileage,
    specs,
  });

  let nextDate = nextIntervalDate;
  if (category === "oil_change" && nextIntervalMileage != null) {
    const oilInterval = resolveOilChangeInterval(specs);
    const merged = mergeServiceDueDates({
      lastServiceIsoDate: isoDate,
      intervalMonths: oilInterval.intervalMonths,
      lastMileageKm: mileage,
      nextDueKm: nextIntervalMileage,
      latestKnownMileageKm: latestKm,
      kmPerDay,
    });
    nextDate = merged.nextDueDateIso;
  } else if (
    (category === "brakes_front" || category === "brakes_rear") &&
    nextIntervalMileage != null
  ) {
    const merged = mergeServiceDueDates({
      lastServiceIsoDate: isoDate,
      intervalMonths: preset.intervalMonths,
      lastMileageKm: mileage,
      nextDueKm: nextIntervalMileage,
      latestKnownMileageKm: latestKm,
      kmPerDay,
    });
    nextDate = merged.nextDueDateIso;
  }

  return {
    category,
    title,
    service_date: isoDate,
    mileage_km: mileage,
    performed_by: document.vendor?.trim() || null,
    notes: document.notes?.trim() || null,
    next_interval_mileage_km: nextIntervalMileage,
    next_interval_date: nextDate,
    show_on_public_showcase: document.show_on_public_showcase === true,
  };
}

export async function upsertServiceRecordFromDocument(
  document: Document,
  options: {
    allDocuments?: Document[];
    techSpecs?: Vehicle["tech_specs"];
  } = {},
): Promise<void> {
  if (!isSupabaseAdminConfigured()) return;

  const payload = buildServiceRecordPayloadFromDocument(
    document,
    options.allDocuments ?? [document],
    options.techSpecs,
  );
  if (!payload) return;

  const admin = createAdminClient();
  const row = {
    vehicle_id: document.vehicle_id,
    invoice_document_id: document.id,
    ...payload,
    updated_at: new Date().toISOString(),
  };

  const { data: existing } = await admin
    .from("service_records")
    .select("id")
    .eq("invoice_document_id", document.id)
    .maybeSingle();

  if (existing?.id) {
    await admin.from("service_records").update(row).eq("id", existing.id);
    return;
  }

  await admin.from("service_records").insert(row);
}
