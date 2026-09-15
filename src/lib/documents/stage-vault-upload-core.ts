import "server-only";

import { randomUUID } from "crypto";

import { getCurrentUser } from "@/lib/auth/get-user";
import {
  contributorMayWriteDocumentType,
  getVehicleWriteAccess,
  writeAccessErrorMessage,
} from "@/lib/auth/vehicle-write-access";
import { DOCUMENT_BUCKET } from "@/lib/documents/constants";
import { documentStorageObjectPath } from "@/lib/documents/storage-path";
import type { StageVaultDocumentResult } from "@/lib/documents/vault-document";
import { FEATURE } from "@/lib/permissions/feature-access";
import { featureDeniedToForbidden } from "@/lib/permissions/feature-gate-result";
import { assertVehicleDocumentWrite } from "@/lib/permissions/require-feature";
import type { FileValidationSuccess } from "@/lib/security/file-upload";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { MOCK_TAG_UUIDS } from "@/lib/tags/mock-tags";

/**
 * Storage-only staging for Gutachten Tresor (shared by API route + server action).
 */
export async function stageVaultUploadCore(
  vehicleId: string,
  tagUuid: string,
  fileCheck: FileValidationSuccess,
): Promise<StageVaultDocumentResult> {
  const documentId = randomUUID();
  const safeName = fileCheck.safeName;
  const bytes = Buffer.from(fileCheck.bytes);

  const { isConfigured } = getSupabaseEnv();
  if (!isConfigured) {
    if (tagUuid !== MOCK_TAG_UUIDS.active) {
      return {
        status: "error",
        message: "Mock-Upload nur für demo-active-tag.",
      };
    }
    return {
      status: "staged",
      documentId,
      fileUrl: `mock://upload/${documentId}/${safeName}`,
      tagUuid,
    };
  }

  const user = await getCurrentUser();
  if (!user) {
    return {
      status: "error",
      message: "Bitte mit dem Fahrzeug-Konto anmelden, um zu speichern.",
    };
  }

  const supabase = await createClient();
  const writeAccess = await getVehicleWriteAccess(vehicleId, user.id);
  if (!writeAccess.ok || !writeAccess.ownerUserId) {
    return {
      status: "error",
      message: writeAccessErrorMessage(writeAccess),
    };
  }

  const vault = await assertVehicleDocumentWrite(
    writeAccess,
    FEATURE.DOCUMENT_VAULT,
  );
  if (!vault.ok) {
    return featureDeniedToForbidden(vault);
  }

  if (
    !contributorMayWriteDocumentType(
      writeAccess.isContributor,
      writeAccess.isOwner,
      "abe",
    )
  ) {
    return {
      status: "error",
      message: "Schrauber können keine Gutachten/ABEs ablegen.",
    };
  }

  const storagePath = documentStorageObjectPath(
    vehicleId,
    documentId,
    safeName,
  );
  const { error: storageError } = await supabase.storage
    .from(DOCUMENT_BUCKET)
    .upload(storagePath, bytes, {
      contentType: fileCheck.mime,
      upsert: false,
    });

  if (storageError) {
    return { status: "error", message: `Storage: ${storageError.message}` };
  }

  return {
    status: "staged",
    documentId,
    fileUrl: storagePath,
    tagUuid,
  };
}
