import "server-only";

import { brakeServiceRecordsFromDocuments } from "@/lib/documents/brake-service";
import {
  oilChangeRecordsFromDocuments,
  resolveOilChangeInterval,
} from "@/lib/documents/oil-changes";
import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { parseVehicleTechSpecs } from "@/lib/vehicles/tech-specs";
import type { Document, Vehicle } from "@/types/database";

export type MaintenanceScheduleKind = "oil_change" | "brake_pads";

type ScheduleRow = {
  vehicle_id: string;
  kind: MaintenanceScheduleKind;
  last_document_id: string | null;
  last_service_date: string;
  last_mileage_km: number;
  next_due_km: number;
  next_due_date: string;
  part_number: string | null;
  km_per_day: number | null;
};

function serviceDateFromDocument(document: Document): string {
  return document.date?.slice(0, 10) ?? document.created_at.slice(0, 10);
}

function buildRows(
  vehicleId: string,
  documents: Document[],
  techSpecs: Vehicle["tech_specs"],
): ScheduleRow[] {
  const oilInterval = resolveOilChangeInterval(parseVehicleTechSpecs(techSpecs));
  const oilRecords = oilChangeRecordsFromDocuments(documents, oilInterval);
  const brakeRecords = brakeServiceRecordsFromDocuments(documents);

  const rows: ScheduleRow[] = [];

  const latestOil = oilRecords[0];
  if (latestOil) {
    const oilDoc = documents.find((d) => d.id === latestOil.id);
    rows.push({
      vehicle_id: vehicleId,
      kind: "oil_change",
      last_document_id: latestOil.id,
      last_service_date: oilDoc
        ? serviceDateFromDocument(oilDoc)
        : new Date().toISOString().slice(0, 10),
      last_mileage_km: latestOil.mileageKm,
      next_due_km: latestOil.nextDueKm,
      next_due_date: latestOil.nextDueDateIso ?? latestOil.nextDueDate,
      part_number: latestOil.partNumber ?? null,
      km_per_day: latestOil.kmPerDay ?? null,
    });
  }

  const latestBrake = brakeRecords[0];
  if (latestBrake) {
    const brakeDoc = documents.find((d) => d.id === latestBrake.id);
    rows.push({
      vehicle_id: vehicleId,
      kind: "brake_pads",
      last_document_id: latestBrake.id,
      last_service_date: brakeDoc
        ? serviceDateFromDocument(brakeDoc)
        : new Date().toISOString().slice(0, 10),
      last_mileage_km: latestBrake.mileageKm,
      next_due_km: latestBrake.nextDueKm,
      next_due_date: latestBrake.nextDueDateIso,
      part_number: latestBrake.partNumber ?? null,
      km_per_day: latestBrake.kmPerDay ?? null,
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

  const rows = buildRows(
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
