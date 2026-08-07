"use server";

import { revalidatePath } from "next/cache";

import {
  contributorMayWriteDocumentType,
  getVehicleWriteAccess,
} from "@/lib/auth/vehicle-write-access";
import { getCurrentUser } from "@/lib/auth/get-user";
import { parseApprovalFields } from "@/lib/documents/approval-fields";
import {
  getMockUploadedDocuments,
  updateMockUploadedDocument,
} from "@/lib/documents/mock-uploads";
import {
  createAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/admin";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { TuevReportService } from "@/services/documents";

export type UpdateTuevApprovalFieldsResult =
  | { status: "ok" }
  | { status: "error"; message: string };

type UpdatePayload = {
  documentId: string;
  vehicleId: string;
  tagUuid: string;
  nextInspectionDate: string | null;
};

function revalidateDocumentPaths(tagUuid: string, documentId: string) {
  revalidatePath(`/v/${tagUuid}`);
  revalidatePath(`/v/${tagUuid}/dokumente`);
  revalidatePath(`/v/${tagUuid}/dokumente/${documentId}`);
  revalidatePath(`/v/${tagUuid}/service`);
  revalidatePath(`/v/${tagUuid}/historie`);
}

/**
 * Owner: patch `approval_fields.data.nextInspectionDate` on TÜV documents.
 */
export async function updateTuevApprovalFields(
  input: UpdatePayload,
): Promise<UpdateTuevApprovalFieldsResult> {
  const documentId = input.documentId.trim();
  const vehicleId = input.vehicleId.trim();
  const tagUuid = input.tagUuid.trim();

  if (!documentId || !vehicleId || !tagUuid) {
    return { status: "error", message: "Ungültige Anfrage." };
  }

  const { isConfigured } = getSupabaseEnv();

  if (!isConfigured) {
    const uploaded = await getMockUploadedDocuments(vehicleId);
    const target = uploaded.find((doc) => doc.id === documentId);
    if (!target) {
      return {
        status: "error",
        message: "Demo-Dokumente können nicht bearbeitet werden — nur eigene Uploads.",
      };
    }
    if (target.approval_fields?.kind !== "tuev") {
      return { status: "error", message: "Kein TÜV-Dokument." };
    }

    const service = new TuevReportService();
    const data = service.parseAndValidate({
      ...target.approval_fields.data,
      nextInspectionDate: input.nextInspectionDate,
    });

    await updateMockUploadedDocument(vehicleId, documentId, {
      approval_fields: { kind: "tuev", data },
    });
    revalidateDocumentPaths(tagUuid, documentId);
    return { status: "ok" };
  }

  const user = await getCurrentUser();
  if (!user) {
    return { status: "error", message: "Nicht angemeldet." };
  }

  const writeAccess = await getVehicleWriteAccess(vehicleId, user.id);
  if (!writeAccess.ok || !writeAccess.isOwner) {
    return {
      status: "error",
      message: "Nur der Eigentümer kann die nächste HU ändern.",
    };
  }

  if (!isSupabaseAdminConfigured()) {
    return { status: "error", message: "SUPABASE_SERVICE_ROLE_KEY fehlt." };
  }

  const admin = createAdminClient();
  const { data: document, error: loadError } = await admin
    .from("documents")
    .select("id, type, vehicle_id, approval_fields")
    .eq("id", documentId)
    .eq("vehicle_id", vehicleId)
    .maybeSingle();

  if (loadError) {
    return { status: "error", message: loadError.message };
  }
  if (!document) {
    return { status: "error", message: "Dokument nicht gefunden." };
  }

  if (
    !contributorMayWriteDocumentType(
      writeAccess.isContributor,
      writeAccess.isOwner,
      document.type,
    )
  ) {
    return {
      status: "error",
      message: "Kein Schreibzugriff auf dieses Dokument.",
    };
  }

  const approvalFields = parseApprovalFields(document.approval_fields);
  if (approvalFields?.kind !== "tuev") {
    return { status: "error", message: "Kein TÜV-Dokument." };
  }

  const service = new TuevReportService();
  let data;
  try {
    data = service.parseAndValidate({
      ...approvalFields.data,
      nextInspectionDate: input.nextInspectionDate,
    });
  } catch {
    return {
      status: "error",
      message: "Ungültiges Datum für die nächste HU.",
    };
  }

  const { error: updateError } = await admin
    .from("documents")
    .update({ approval_fields: { kind: "tuev", data } })
    .eq("id", documentId)
    .eq("vehicle_id", vehicleId);

  if (updateError) {
    return { status: "error", message: updateError.message };
  }

  revalidateDocumentPaths(tagUuid, documentId);
  return { status: "ok" };
}
