"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/get-user";
import {
  contributorMayWriteDocumentType,
  getVehicleWriteAccess,
  writeAccessErrorMessage,
} from "@/lib/auth/vehicle-write-access";
import { parseLineItems } from "@/lib/documents/line-items";
import {
  isManualEntryMarker,
  isManualEntryUrl,
  isManualVehicleEntry,
  parseManualEntryCategory,
  type ManualEntryCategory,
} from "@/lib/documents/manual-entries";
import {
  manualEntryFieldsFromFormData,
  manualEntryUpdateFieldsSchema,
  parseManualEntryDate,
  parseManualEntryMileageKm,
  resolveManualEntryAmount,
} from "@/lib/documents/manual-entry-input";
import { revalidateManualEntryPaths } from "@/lib/documents/manual-entry-paths";
import {
  getMockUploadedDocuments,
  updateMockUploadedDocument,
} from "@/lib/documents/mock-uploads";
import { FEATURE } from "@/lib/permissions/feature-access";
import { assertOwnerFeature } from "@/lib/permissions/require-feature";
import {
  createAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/admin";
import { getSupabaseEnv } from "@/lib/supabase/env";
import type { Document } from "@/types/database";

export type UpdateManualEntryResult =
  | { status: "ok" }
  | { status: "error"; message: string };

function isStoredManualEntry(document: Pick<Document, "invoice_number" | "file_url">): boolean {
  return (
    isManualEntryMarker(document.invoice_number) ||
    isManualEntryUrl(document.file_url)
  );
}

/**
 * Update an existing manual Wartung / Tuning log (text fields + line items).
 * Photos are unchanged unless a dedicated upload flow is added later.
 */
export async function updateManualVehicleEntry(
  formData: FormData,
): Promise<UpdateManualEntryResult> {
  const parsed = manualEntryUpdateFieldsSchema.safeParse(
    manualEntryFieldsFromFormData(formData),
  );
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path.join(".") ?? "Eingabe";
    return {
      status: "error",
      message: `Ungültige ${field === "vehicleId" ? "Fahrzeug-ID" : field}.`,
    };
  }

  const data = parsed.data;
  const documentId = data.documentId.trim();
  const category = parseManualEntryCategory(data.category) as ManualEntryCategory;
  if (!category) {
    return { status: "error", message: "Ungültige Kategorie." };
  }

  const dateRaw = data.date?.trim() ?? "";
  if (dateRaw && !parseManualEntryDate(dateRaw)) {
    return { status: "error", message: "Datum ungültig." };
  }
  const date = parseManualEntryDate(dateRaw);
  const lineItems = parseLineItems(formData.get("lineItems"));
  const amount = resolveManualEntryAmount(formData, data.amount);
  const vendor = data.vendor?.trim().slice(0, 160) || null;
  const notes = data.notes?.trim().slice(0, 500) || null;
  const mileageKm = parseManualEntryMileageKm(data.mileageKm);
  const title = data.title.trim().slice(0, 160);

  const patch = {
    title,
    category,
    date,
    vendor,
    notes,
    mileage_km: mileageKm,
    line_items: lineItems && lineItems.length > 0 ? lineItems : null,
    amount,
  };

  const { isConfigured } = getSupabaseEnv();

  if (!isConfigured) {
    const uploaded = await getMockUploadedDocuments(data.vehicleId);
    const target = uploaded.find((doc) => doc.id === documentId);
    if (!target || !isManualVehicleEntry(target)) {
      return { status: "error", message: "Manueller Eintrag nicht gefunden." };
    }
    await updateMockUploadedDocument(data.vehicleId, documentId, patch);
    revalidateManualEntryPaths(data.tagUuid, documentId);
    return { status: "ok" };
  }

  const user = await getCurrentUser();
  if (!user) {
    return { status: "error", message: "Bitte anmelden." };
  }

  const writeAccess = await getVehicleWriteAccess(data.vehicleId, user.id);
  if (!writeAccess.ok || !writeAccess.ownerUserId) {
    return {
      status: "error",
      message: writeAccessErrorMessage(writeAccess),
    };
  }

  const manualEntry = await assertOwnerFeature(
    writeAccess.ownerUserId,
    FEATURE.ADD_MANUAL_SERVICE_ENTRY,
  );
  if (!manualEntry.ok) {
    return { status: "error", message: manualEntry.message };
  }

  if (
    !contributorMayWriteDocumentType(
      writeAccess.isContributor,
      writeAccess.isOwner,
      "invoice",
    )
  ) {
    return {
      status: "error",
      message: "Keine Berechtigung für diesen Eintrag.",
    };
  }

  if (!isSupabaseAdminConfigured()) {
    return { status: "error", message: "SUPABASE_SERVICE_ROLE_KEY fehlt." };
  }

  const admin = createAdminClient();
  const { data: document, error: loadError } = await admin
    .from("documents")
    .select("id, type, vehicle_id, file_url, invoice_number")
    .eq("id", documentId)
    .eq("vehicle_id", data.vehicleId)
    .maybeSingle();

  if (loadError) {
    return { status: "error", message: loadError.message };
  }
  if (!document || !isStoredManualEntry(document)) {
    return { status: "error", message: "Manueller Eintrag nicht gefunden." };
  }

  const { error: updateError } = await admin
    .from("documents")
    .update(patch)
    .eq("id", documentId)
    .eq("vehicle_id", data.vehicleId);

  if (updateError) {
    return { status: "error", message: updateError.message };
  }

  revalidateManualEntryPaths(data.tagUuid, documentId);
  revalidatePath(`/v/${data.tagUuid}/dokumente/${documentId}`);
  return { status: "ok" };
}
