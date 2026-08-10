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
import type { TuevDefectRow, TuevReport } from "@/lib/validations/documentSchemas";
import {
  TuevReportService,
  inferResultFromDefectRows,
} from "@/services/documents";

export type UpdateTuevApprovalFieldsResult =
  | { status: "ok" }
  | { status: "error"; message: string };

type UpdatePayload = {
  documentId: string;
  vehicleId: string;
  tagUuid: string;
  nextInspectionDate?: string | null;
  defectsTable?: TuevDefectRow[] | null;
};

function revalidateDocumentPaths(tagUuid: string, documentId: string) {
  revalidatePath(`/v/${tagUuid}`);
  revalidatePath(`/v/${tagUuid}/dokumente`);
  revalidatePath(`/v/${tagUuid}/dokumente/${documentId}`);
  revalidatePath(`/v/${tagUuid}/service`);
  revalidatePath(`/v/${tagUuid}/historie`);
}

function buildUpdatedTuevData(
  existing: TuevReport,
  input: Pick<UpdatePayload, "nextInspectionDate" | "defectsTable">,
): TuevReport {
  const next: TuevReport = { ...existing };

  if (input.nextInspectionDate !== undefined) {
    next.nextInspectionDate = input.nextInspectionDate;
  }

  if (input.defectsTable !== undefined) {
    next.defectsTable = input.defectsTable;
    next.defectsList = null;
    next.result = inferResultFromDefectRows(input.defectsTable, existing.result);
  }

  return next;
}

function hasPatch(input: UpdatePayload): boolean {
  return (
    input.nextInspectionDate !== undefined || input.defectsTable !== undefined
  );
}

/**
 * Owner: patch TÜV `approval_fields` (next HU month, festgestellte Mängel, …).
 */
export async function updateTuevApprovalFields(
  input: UpdatePayload,
): Promise<UpdateTuevApprovalFieldsResult> {
  const documentId = input.documentId.trim();
  const vehicleId = input.vehicleId.trim();
  const tagUuid = input.tagUuid.trim();

  if (!documentId || !vehicleId || !tagUuid || !hasPatch(input)) {
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
    let data;
    try {
      data = service.parseAndValidate(
        buildUpdatedTuevData(target.approval_fields.data, input),
      );
    } catch {
      return {
        status: "error",
        message:
          input.defectsTable !== undefined
            ? "Mängel konnten nicht gespeichert werden."
            : "Ungültiges Datum für die nächste HU.",
      };
    }

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
      message: "Nur der Eigentümer kann TÜV-Daten ändern.",
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
    data = service.parseAndValidate(
      buildUpdatedTuevData(approvalFields.data, input),
    );
  } catch {
    return {
      status: "error",
      message:
        input.defectsTable !== undefined
          ? "Mängel konnten nicht gespeichert werden."
          : "Ungültiges Datum für die nächste HU.",
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
