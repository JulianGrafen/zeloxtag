"use server";

import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/get-user";
import {
  getVehicleWriteAccess,
  writeAccessErrorMessage,
} from "@/lib/auth/vehicle-write-access";
import { createManualVehicleEntry } from "@/actions/create-manual-entry";
import { revalidateManualEntryPaths } from "@/lib/documents/manual-entry-paths";
import type { ManualServiceEntryType } from "@/lib/documents/manual-entries";
import { FEATURE } from "@/lib/permissions/feature-access";
import { assertOwnerFeature } from "@/lib/permissions/require-feature";
import { logServerError } from "@/lib/security/public-error";
import {
  computeNextIntervals,
  serviceCategoryPreset,
} from "@/lib/service/category-presets";
import { mergeServiceDueDates } from "@/lib/maintenance/service-due";
import {
  estimateKmPerDayFromDocuments,
  latestKnownMileageKm,
} from "@/lib/vehicles/mileage-velocity";
import { recomputeVehicleMaintenanceSchedules } from "@/lib/maintenance/recompute-schedules";
import {
  isLegacyServiceRecordId,
  isServiceRecordCategory,
  SERVICE_RECORD_CATEGORIES,
  serviceRecordToInsert,
  type ServiceRecordCategory,
} from "@/lib/service/service-record";
import { syncServiceRecordForDocument } from "@/lib/service/sync-document";
import { createClient } from "@/lib/supabase/server";
import { parseVehicleTechSpecs } from "@/lib/vehicles/tech-specs";
import type { Document } from "@/types/database";

export type ServiceRecordActionResult =
  | { status: "ok"; recordId: string }
  | { status: "error"; message: string };

const recordFieldsSchema = z.object({
  vehicleId: z.string().uuid(),
  tagUuid: z.string().trim().max(128).optional(),
  category: z.enum(SERVICE_RECORD_CATEGORIES),
  title: z.string().trim().min(2).max(160),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  mileageKm: z.string().trim().max(16).optional().default(""),
  performedBy: z.string().trim().max(160).optional().default(""),
  notes: z.string().trim().max(500).optional().default(""),
  showOnPublicShowcase: z.enum(["true", "false", ""]).optional().default(""),
  useDocumentDualWrite: z.enum(["true", "false", ""]).optional().default(""),
  vendor: z.string().trim().max(160).optional().default(""),
  selfMade: z.enum(["true", "false", ""]).optional().default(""),
  oilSpec: z.string().trim().max(120).optional().default(""),
  oilAmountLiters: z.string().trim().max(16).optional().default(""),
  filterChanged: z.enum(["true", "false", ""]).optional().default(""),
});

function parseMileageKm(raw: string): number {
  const digits = raw.replace(/[^\d]/g, "");
  const value = Number.parseInt(digits, 10);
  if (!Number.isFinite(value) || value < 0) return 0;
  return value;
}

function manualServiceTypeForCategory(
  category: ServiceRecordCategory,
): ManualServiceEntryType {
  if (category === "oil_change") return "oil_change";
  if (category === "brakes_front" || category === "brakes_rear") return "brakes";
  if (category === "inspection") return "service";
  if (category === "tuev") return "other";
  return "other";
}

async function assertServiceWrite(vehicleId: string) {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false as const, message: "Bitte anmelden." };
  }
  const writeAccess = await getVehicleWriteAccess(vehicleId, user.id);
  if (!writeAccess.ok || !writeAccess.ownerUserId) {
    return {
      ok: false as const,
      message: writeAccessErrorMessage(writeAccess),
    };
  }
  const feature = await assertOwnerFeature(
    writeAccess.ownerUserId,
    FEATURE.ADD_MANUAL_SERVICE_ENTRY,
  );
  if (!feature.ok) {
    return { ok: false as const, message: feature.message };
  }
  return { ok: true as const, userId: user.id, ownerUserId: writeAccess.ownerUserId };
}

export async function createServiceRecord(
  formData: FormData,
): Promise<ServiceRecordActionResult> {
  const parsed = recordFieldsSchema.safeParse({
    vehicleId: String(formData.get("vehicleId") ?? ""),
    tagUuid: String(formData.get("tagUuid") ?? ""),
    category: String(formData.get("category") ?? ""),
    title: String(formData.get("title") ?? ""),
    date: String(formData.get("date") ?? ""),
    mileageKm: String(formData.get("mileageKm") ?? ""),
    performedBy: String(formData.get("performedBy") ?? ""),
    notes: String(formData.get("notes") ?? ""),
    showOnPublicShowcase: String(formData.get("showOnPublicShowcase") ?? ""),
    useDocumentDualWrite: String(formData.get("useDocumentDualWrite") ?? ""),
    vendor: String(formData.get("vendor") ?? ""),
    selfMade: String(formData.get("selfMade") ?? ""),
    oilSpec: String(formData.get("oilSpec") ?? ""),
    oilAmountLiters: String(formData.get("oilAmountLiters") ?? ""),
    filterChanged: String(formData.get("filterChanged") ?? ""),
  });

  if (!parsed.success || !isServiceRecordCategory(parsed.data.category)) {
    return { status: "error", message: "Ungültige Eingabe." };
  }

  const data = parsed.data;
  const access = await assertServiceWrite(data.vehicleId);
  if (!access.ok) return { status: "error", message: access.message };

  const mileage = parseMileageKm(data.mileageKm);
  const showOnShowcase = data.showOnPublicShowcase === "true";
  const dualWrite =
    data.useDocumentDualWrite === "true" ||
    data.category === "oil_change" ||
    formData.has("photos") ||
    formData.has("photo");

  if (dualWrite) {
    const manualForm = new FormData();
    manualForm.set("vehicleId", data.vehicleId);
    if (data.tagUuid) manualForm.set("tagUuid", data.tagUuid);
    manualForm.set("category", "service");
    manualForm.set("serviceType", manualServiceTypeForCategory(data.category));
    manualForm.set(
      "entryType",
      data.category === "oil_change" ? "oil_change" : "default",
    );
    manualForm.set("title", data.title);
    manualForm.set("date", data.date);
    manualForm.set("mileageKm", String(mileage));
    manualForm.set("vendor", data.performedBy || data.vendor);
    manualForm.set("notes", data.notes);
    manualForm.set("selfMade", data.selfMade);
    manualForm.set("oilSpec", data.oilSpec);
    manualForm.set("oilAmountLiters", data.oilAmountLiters);
    manualForm.set("filterChanged", data.filterChanged || "true");
    manualForm.set("showOnPublicShowcase", showOnShowcase ? "true" : "false");
    for (const [key, value] of formData.entries()) {
      if (key === "photos" || key === "photo") {
        manualForm.append(key, value);
      }
    }

    const created = await createManualVehicleEntry(manualForm);
    if (created.status === "error") {
      return { status: "error", message: created.message };
    }

    const supabase = await createClient();
    const { data: document } = await supabase
      .from("documents")
      .select("*")
      .eq("id", created.documentId)
      .maybeSingle();

    if (document) {
      await syncServiceRecordForDocument(document as Document);
      if (showOnShowcase) {
        await supabase
          .from("service_records")
          .update({ show_on_public_showcase: true })
          .eq("invoice_document_id", created.documentId);
      }
    }

    void recomputeVehicleMaintenanceSchedules(data.vehicleId);
    return { status: "ok", recordId: created.documentId };
  }

  const supabase = await createClient();
  const { data: vehicle } = await supabase
    .from("vehicles")
    .select("tech_specs")
    .eq("id", data.vehicleId)
    .maybeSingle();

  const specs = parseVehicleTechSpecs(vehicle?.tech_specs);
  const preset = serviceCategoryPreset(data.category, specs);
  const { nextIntervalMileage, nextIntervalDate } = computeNextIntervals({
    category: data.category,
    serviceDate: data.date,
    mileageKm: mileage,
    specs,
  });

  let nextDate = nextIntervalDate;
  if (nextIntervalMileage != null) {
    const { data: docs } = await supabase
      .from("documents")
      .select("*")
      .eq("vehicle_id", data.vehicleId);
    const kmPerDay = estimateKmPerDayFromDocuments((docs ?? []) as Document[]);
    const latestKm = latestKnownMileageKm((docs ?? []) as Document[]);
    const merged = mergeServiceDueDates({
      lastServiceIsoDate: data.date,
      intervalMonths: preset.intervalMonths,
      lastMileageKm: mileage,
      nextDueKm: nextIntervalMileage,
      latestKnownMileageKm: latestKm,
      kmPerDay,
    });
    nextDate = merged.nextDueDateIso;
  }

  const insert = serviceRecordToInsert({
    vehicleId: data.vehicleId,
    category: data.category,
    title: data.title,
    date: data.date,
    mileage,
    performedBy: data.performedBy?.trim() || null,
    notes: data.notes?.trim() || null,
    invoiceDocumentId: null,
    nextIntervalMileage,
    nextIntervalDate: nextDate,
    showOnPublicShowcase: showOnShowcase,
  });

  const { data: row, error } = await supabase
    .from("service_records")
    .insert(insert)
    .select("id")
    .single();

  if (error || !row) {
    logServerError("[service-records] insert failed", error);
    return { status: "error", message: "Speichern fehlgeschlagen." };
  }

  await revalidateManualEntryPaths(data.vehicleId, data.tagUuid);
  void recomputeVehicleMaintenanceSchedules(data.vehicleId);
  return { status: "ok", recordId: row.id };
}

export async function deleteServiceRecord(
  recordId: string,
  vehicleId: string,
  tagUuid?: string,
): Promise<ServiceRecordActionResult> {
  const supabaseCheck = await createClient();
  const { data: linkedDoc } = await supabaseCheck
    .from("service_records")
    .select("id")
    .eq("vehicle_id", vehicleId)
    .eq("invoice_document_id", recordId)
    .maybeSingle();
  if (!linkedDoc) {
    const { data: docOnly } = await supabaseCheck
      .from("documents")
      .select("id")
      .eq("id", recordId)
      .eq("vehicle_id", vehicleId)
      .maybeSingle();
    if (docOnly) {
      return {
        status: "error",
        message: "Verknüpfte Belege können nur im Beleg gelöscht werden.",
      };
    }
  }

  const access = await assertServiceWrite(vehicleId);
  if (!access.ok) return { status: "error", message: access.message };

  const supabase = await createClient();
  const { error } = await supabase
    .from("service_records")
    .delete()
    .eq("id", recordId)
    .eq("vehicle_id", vehicleId);

  if (error) {
    return { status: "error", message: "Löschen fehlgeschlagen." };
  }

  await revalidateManualEntryPaths(vehicleId, tagUuid);
  void recomputeVehicleMaintenanceSchedules(vehicleId);
  return { status: "ok", recordId };
}
