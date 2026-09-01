"use server";

import { revalidatePath } from "next/cache";

import { FEATURE } from "@/lib/permissions/feature-access";
import { assertOwnerFeature } from "@/lib/permissions/require-feature";
import { DOCUMENT_BUCKET } from "@/lib/documents/constants";
import {
  getMockUploadedDocuments,
  removeMockUploadedDocument,
} from "@/lib/documents/mock-uploads";
import { resolveStoragePath } from "@/lib/documents/storage-path";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { assertVehicleOwner } from "@/lib/vehicles/assert-owner";

export type DeleteDocumentResult =
  | { status: "deleted"; documentId: string }
  | { status: "error"; message: string };

/**
 * Owner-only: delete a document row and its Storage object (when present).
 */
export async function deleteDocument(input: {
  documentId: string;
  vehicleId: string;
  tagUuid: string;
}): Promise<DeleteDocumentResult> {
  const documentId = input.documentId.trim();
  const vehicleId = input.vehicleId.trim();
  const tagUuid = input.tagUuid.trim();

  if (!documentId || !vehicleId || !tagUuid) {
    return { status: "error", message: "Ungültige Lösch-Anfrage." };
  }

  const { isConfigured } = getSupabaseEnv();

  if (!isConfigured) {
    // Seeded mock docs are read-only; only cookie uploads can be removed.
    const uploaded = await getMockUploadedDocuments(vehicleId);
    const target = uploaded.find((doc) => doc.id === documentId);
    if (!target) {
      return {
        status: "error",
        message: "Demo-Dokumente können nicht gelöscht werden — nur eigene Uploads.",
      };
    }

    const removed = await removeMockUploadedDocument(vehicleId, documentId);
    if (!removed) {
      return { status: "error", message: "Dokument nicht gefunden." };
    }

    revalidatePath(`/v/${tagUuid}`);
    revalidatePath(`/v/${tagUuid}/dokumente`);
    revalidatePath(`/v/${tagUuid}/service`);
    revalidatePath(`/v/${tagUuid}/eintrag`);
    revalidatePath(`/v/${tagUuid}/umbauten`);
    return { status: "deleted", documentId };
  }

  const ownership = await assertVehicleOwner(vehicleId);
  if (!ownership.ok) {
    return { status: "error", message: ownership.message };
  }
  const vault = await assertOwnerFeature(ownership.userId, FEATURE.DOCUMENT_VAULT);
  if (!vault.ok) {
    return { status: "error", message: vault.message };
  }

  const supabase = await createClient();
  const { data: document, error: loadError } = await supabase
    .from("documents")
    .select("*")
    .eq("id", documentId)
    .eq("vehicle_id", vehicleId)
    .maybeSingle();

  if (loadError) {
    return { status: "error", message: loadError.message };
  }
  if (!document) {
    return { status: "error", message: "Dokument nicht gefunden." };
  }

  const storagePath = resolveStoragePath(document.file_url);

  const { error: deleteError } = await supabase
    .from("documents")
    .delete()
    .eq("id", documentId)
    .eq("vehicle_id", vehicleId);

  if (deleteError) {
    return { status: "error", message: deleteError.message };
  }

  if (storagePath) {
    await supabase.storage.from(DOCUMENT_BUCKET).remove([storagePath]);
  }

  revalidatePath(`/v/${tagUuid}`);
  revalidatePath(`/v/${tagUuid}/dokumente`);
  revalidatePath(`/v/${tagUuid}/service`);
  revalidatePath(`/v/${tagUuid}/eintrag`);
  revalidatePath(`/v/${tagUuid}/umbauten`);
  return { status: "deleted", documentId };
}
