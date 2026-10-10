"use server";

import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/get-user";
import {
  contributorMayWriteDocumentType,
  getVehicleWriteAccess,
  writeAccessErrorMessage,
} from "@/lib/auth/vehicle-write-access";
import { DOCUMENT_BUCKET, DOCUMENT_MAX_PAGES } from "@/lib/documents/constants";
import {
  isManualEntryMarker,
  isManualEntryUrl,
} from "@/lib/documents/manual-entries";
import { revalidateManualEntryPaths } from "@/lib/documents/manual-entry-paths";
import {
  getMockUploadedDocuments,
  updateMockUploadedDocument,
} from "@/lib/documents/mock-uploads";
import { documentStorageObjectPath, resolveStoragePath } from "@/lib/documents/storage-path";
import { FEATURE } from "@/lib/permissions/feature-access";
import {
  assertOwnerFeature,
  assertVehicleDocumentWrite,
} from "@/lib/permissions/require-feature";
import { validateDocumentUpload } from "@/lib/security/file-upload";
import {
  createAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/admin";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import {
  revalidateDocumentDetailPaths,
  revalidateVehicleSurfacePaths,
  resolveRevalidationScope,
} from "@/lib/vehicle-surface/revalidate-paths";

const fieldsSchema = z.object({
  documentId: z.string().uuid(),
  vehicleId: z.string().uuid(),
  tagUuid: z.string().trim().max(128).optional(),
  pageCount: z.coerce.number().int().min(1).max(DOCUMENT_MAX_PAGES),
});

export type AppendInvoiceDocumentMediaResult =
  | { status: "ok" }
  | { status: "error"; message: string };

function isStoredManualEntry(document: {
  invoice_number: string | null;
  file_url: string;
}): boolean {
  return (
    isManualEntryMarker(document.invoice_number) ||
    isManualEntryUrl(document.file_url)
  );
}

async function revalidateInvoiceDocumentPaths(
  vehicleId: string,
  documentId: string,
): Promise<void> {
  const scope = await resolveRevalidationScope(vehicleId);
  revalidateVehicleSurfacePaths(scope);
  revalidateDocumentDetailPaths(scope, documentId);
  await revalidateManualEntryPaths(vehicleId, undefined, documentId);
}

/**
 * Replace or set the stored file for an invoice/receipt (merged PDF from client).
 */
export async function appendInvoiceDocumentMedia(
  formData: FormData,
): Promise<AppendInvoiceDocumentMediaResult> {
  const parsed = fieldsSchema.safeParse({
    documentId: String(formData.get("documentId") ?? ""),
    vehicleId: String(formData.get("vehicleId") ?? ""),
    tagUuid: String(formData.get("tagUuid") ?? ""),
    pageCount: String(formData.get("pageCount") ?? ""),
  });

  if (!parsed.success) {
    return { status: "error", message: "Ungültige Anfrage." };
  }

  const { documentId, vehicleId, pageCount } = parsed.data;
  const fileValue = formData.get("photo");
  if (!(fileValue instanceof File) || fileValue.size === 0) {
    return { status: "error", message: "Keine Datei übergeben." };
  }

  const { isConfigured } = getSupabaseEnv();
  if (!isConfigured) {
    const uploaded = await getMockUploadedDocuments(vehicleId);
    const target = uploaded.find((doc) => doc.id === documentId);
    if (!target || target.type !== "invoice") {
      return { status: "error", message: "Beleg nicht gefunden." };
    }
    await updateMockUploadedDocument(vehicleId, documentId, {
      page_count: pageCount,
      file_url: `mock://${documentId}`,
    });
    await revalidateInvoiceDocumentPaths(vehicleId, documentId);
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

  if (
    !contributorMayWriteDocumentType(
      writeAccess.isContributor,
      writeAccess.isOwner,
      "invoice",
    )
  ) {
    return {
      status: "error",
      message: "Keine Berechtigung für diesen Beleg.",
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
    .eq("vehicle_id", vehicleId)
    .maybeSingle();

  if (loadError) {
    return { status: "error", message: loadError.message };
  }
  if (!document || document.type !== "invoice") {
    return { status: "error", message: "Beleg nicht gefunden." };
  }

  const manual = isStoredManualEntry(document);
  if (manual) {
    const manualGate = await assertOwnerFeature(
      writeAccess.ownerUserId,
      FEATURE.ADD_MANUAL_SERVICE_ENTRY,
    );
    if (!manualGate.ok) {
      return { status: "error", message: manualGate.message };
    }
  } else {
    const vaultGate = await assertVehicleDocumentWrite(
      writeAccess,
      FEATURE.DOCUMENT_VAULT,
      { allowFreeInvoiceScan: true },
    );
    if (!vaultGate.ok) {
      return { status: "error", message: vaultGate.message };
    }
  }

  const fileCheck = await validateDocumentUpload(fileValue, { pdfOnly: false });
  if (!fileCheck.ok) {
    return { status: "error", message: fileCheck.error };
  }

  const existingPath = resolveStoragePath(document.file_url);
  const storagePath =
    existingPath ??
    documentStorageObjectPath(vehicleId, documentId, fileCheck.safeName);

  const supabase = await createClient();
  const bytes = Buffer.from(fileCheck.bytes);
  const { error: storageError } = await supabase.storage
    .from(DOCUMENT_BUCKET)
    .upload(storagePath, bytes, {
      contentType: fileCheck.mime,
      upsert: true,
    });

  if (storageError) {
    return { status: "error", message: storageError.message };
  }

  const patch: Record<string, unknown> = {
    file_url: storagePath,
    page_count: fileCheck.mime === "application/pdf" ? pageCount : 1,
  };

  const { error: updateError } = await admin
    .from("documents")
    .update(patch)
    .eq("id", documentId)
    .eq("vehicle_id", vehicleId);

  if (updateError) {
    return { status: "error", message: updateError.message };
  }

  await revalidateInvoiceDocumentPaths(vehicleId, documentId);
  return { status: "ok" };
}
