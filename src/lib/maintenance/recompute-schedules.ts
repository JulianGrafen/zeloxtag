import "server-only";

import { serviceCategoryLabel } from "@/lib/service/category-presets";
import { loadServiceHistoryForVehicle } from "@/lib/service/load-service-history";
import type { ServiceRecordCategory } from "@/lib/service/service-record";
import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import type { Document, Vehicle } from "@/types/database";

export type MaintenanceScheduleKind =
  | ServiceRecordCategory
  | "oil_change"
  | "brake_pads";

type ScheduleRow = {
  vehicle_id: string;
  kind: string;
  last_document_id: string | null;
  last_service_date: string;
  last_mileage_km: number;
  next_due_km: number;
  next_due_date: string;
  part_number: string | null;
  km_per_day: number | null;
};

function latestByCategory(
  records: Awaited<ReturnType<typeof loadServiceHistoryForVehicle>>,
) {
  const map = new Map<ServiceRecordCategory, (typeof records)[number]>();
  for (const record of records) {
    const existing = map.get(record.category);
    if (!existing || record.date.localeCompare(existing.date) > 0) {
      map.set(record.category, record);
    }
  }
  return map;
}

async function buildRowsFromServiceHistory(
  vehicleId: string,
  documents: Document[],
  techSpecs: Vehicle["tech_specs"],
): Promise<ScheduleRow[]> {
  const history = await loadServiceHistoryForVehicle(
    vehicleId,
    documents,
    techSpecs,
  );
  const byCategory = latestByCategory(history);
  const rows: ScheduleRow[] = [];

  for (const [category, record] of byCategory) {
    if (record.nextIntervalMileage == null && !record.nextIntervalDate) continue;
    rows.push({
      vehicle_id: vehicleId,
      kind: category,
      last_document_id: record.invoiceDocumentId,
      last_service_date: record.date,
      last_mileage_km: record.mileage,
      next_due_km: record.nextIntervalMileage ?? record.mileage,
      next_due_date: record.nextIntervalDate ?? record.date,
      part_number: null,
      km_per_day: null,
    });
  }

  return rows;
}

export async function recomputeVehicleMaintenanceSchedules(
  vehicleId: string,
): Promise<void> {
  if (!isSupabaseAdminConfigured()) return;

  const admin = createAdminClient();
  const { data: vehicle, error: vehicleError } = await admin
    .from("vehicles")
    .select("id, tech_specs")
    .eq("id", vehicleId)
    .maybeSingle();

  if (vehicleError || !vehicle) return;

  const { data: documents, error: docError } = await admin
    .from("documents")
    .select("*")
    .eq("vehicle_id", vehicleId);

  if (docError) return;

  const rows = await buildRowsFromServiceHistory(
    vehicleId,
    (documents ?? []) as Document[],
    vehicle.tech_specs,
  );

  await admin
    .from("vehicle_maintenance_schedules")
    .delete()
    .eq("vehicle_id", vehicleId);

  if (rows.length === 0) return;

  await admin.from("vehicle_maintenance_schedules").upsert(
    rows.map((row) => ({
      ...row,
      updated_at: new Date().toISOString(),
    })),
  );
}

export function maintenanceScheduleLabel(kind: string): string {
  if (kind === "brake_pads") return "Bremsbeläge";
  if (kind === "oil_change") return "Ölwechsel";
  try {
    return serviceCategoryLabel(kind as ServiceRecordCategory);
  } catch {
    return kind;
  }
}
