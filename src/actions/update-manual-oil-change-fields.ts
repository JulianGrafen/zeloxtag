"use server";

import { getCurrentUser } from "@/lib/auth/get-user";
import {
  contributorMayWriteDocumentType,
  getVehicleWriteAccess,
  writeAccessErrorMessage,
} from "@/lib/auth/vehicle-write-access";
import {
  buildManualOilChangePersistPatch,
  type ManualOilChangeFieldPatch,
} from "@/lib/documents/manual-oil-change-patch";
import {
  isManualEntryMarker,
  isManualEntryUrl,
} from "@/lib/documents/manual-entries";
import { isEditableManualOilChangeDocument } from "@/lib/documents/manual-oil-change-form";
import type { Document } from "@/types/database";
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
import { revalidatePath } from "next/cache";

export type UpdateManualOilChangeFieldsResult =
  | { status: "ok" }
  | { status: "error"; message: string };

type UpdateManualOilChangeFieldsInput = {
  documentId: string;
  vehicleId: string;
  tagUuid: string;
  patch: ManualOilChangeFieldPatch;
};

function isStoredManualEntry(document: {
  invoice_number: string | null;
  file_url: string;
}): boolean {
  return (
    isManualEntryMarker(document.invoice_number) ||
    isManualEntryUrl(document.file_url)
  );
}

export async function updateManualOilChangeFields(
  input: UpdateManualOilChangeFieldsInput,
): Promise<UpdateManualOilChangeFieldsResult> {
  const documentId = input.documentId.trim();
  const vehicleId = input.vehicleId.trim();
  const tagUuid = input.tagUuid.trim();
  const patch = input.patch;

  if (!documentId || !vehicleId || !tagUuid) {
    return { status: "error", message: "Ungültige Anfrage." };
  }

  if (Object.keys(patch).length === 0) {
    return { status: "error", message: "Keine Änderungen übergeben." };
  }

  const { isConfigured } = getSupabaseEnv();

  if (!isConfigured) {
    const uploaded = await getMockUploadedDocuments(vehicleId);
    const target = uploaded.find((doc) => doc.id === documentId);
    if (!target || !isEditableManualOilChangeDocument(target)) {
      return { status: "error", message: "Manueller Ölwechsel nicht gefunden." };
    }
    const persistPatch = buildManualOilChangePersistPatch(target, patch);
    await updateMockUploadedDocument(vehicleId, documentId, persistPatch);
    revalidateManualEntryPaths(tagUuid, documentId);
    revalidatePath(`/v/${tagUuid}/intervalle/${documentId}`);
    return { status: "ok" };
  }

  const user = await getCurrentUser();
  if (!user) {
    return { status: "error", message: "Bitte anmelden." };
  }

  const writeAccess = await getVehicleWriteAccess(vehicleId, user.id);
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
    .select("id, type, vehicle_id, file_url, invoice_number, title, notes, vendor, category, mileage_km, date, line_items, amount, created_at")
    .eq("id", documentId)
    .eq("vehicle_id", vehicleId)
    .maybeSingle();

  if (loadError) {
    return { status: "error", message: loadError.message };
  }
  if (
    !document ||
    !isStoredManualEntry(document) ||
    !isEditableManualOilChangeDocument(document as Document)
  ) {
    return { status: "error", message: "Manueller Ölwechsel nicht gefunden." };
  }

  const persistPatch = buildManualOilChangePersistPatch(
    document as Document,
    patch,
  );

  const { error: updateError } = await admin
    .from("documents")
    .update(persistPatch)
    .eq("id", documentId)
    .eq("vehicle_id", vehicleId);

  if (updateError) {
    return { status: "error", message: updateError.message };
  }

  revalidateManualEntryPaths(tagUuid, documentId);
  revalidatePath(`/v/${tagUuid}/intervalle/${documentId}`);
  revalidatePath(`/v/${tagUuid}/dokumente/${documentId}`);
  return { status: "ok" };
}
