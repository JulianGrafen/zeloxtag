"use server";

import { revalidatePath } from "next/cache";

import {
  contributorMayWriteDocumentType,
  getVehicleWriteAccess,
} from "@/lib/auth/vehicle-write-access";
import { getCurrentUser } from "@/lib/auth/get-user";
import { parseLineItems } from "@/lib/documents/line-items";
import {
  getMockUploadedDocuments,
  updateMockUploadedDocument,
} from "@/lib/documents/mock-uploads";
import { parseTechnicalSpecs } from "@/lib/documents/technical-specs";
import { parseAbeConditions, parseStringList } from "@/lib/documents/string-list";
import {
  createAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/admin";
import { getSupabaseEnv } from "@/lib/supabase/env";
import type { DocumentLineItem, DocumentTechnicalSpec } from "@/types/database";

export type UpdateDocumentFieldsResult =
  | { status: "ok" }
  | { status: "error"; message: string };

type UpdatePayload = {
  documentId: string;
  vehicleId: string;
  tagUuid: string;
  lineItems?: DocumentLineItem[] | null;
  vehicleApprovals?: string[] | null;
  technicalSpecs?: DocumentTechnicalSpec[] | null;
  conditions?: string[] | null;
};

function revalidateDocumentPaths(tagUuid: string, documentId: string) {
  revalidatePath(`/v/${tagUuid}`);
  revalidatePath(`/v/${tagUuid}/dokumente`);
  revalidatePath(`/v/${tagUuid}/dokumente/${documentId}`);
  revalidatePath(`/v/${tagUuid}/service`);
}

/**
 * Owner (or Schrauber for invoices): update extracted list fields after review.
 */
export async function updateDocumentFields(
  input: UpdatePayload,
): Promise<UpdateDocumentFieldsResult> {
  const documentId = input.documentId.trim();
  const vehicleId = input.vehicleId.trim();
  const tagUuid = input.tagUuid.trim();

  if (!documentId || !vehicleId || !tagUuid) {
    return { status: "error", message: "Ungültige Anfrage." };
  }

  const hasLineItems = input.lineItems !== undefined;
  const hasApprovals = input.vehicleApprovals !== undefined;
  const hasSpecs = input.technicalSpecs !== undefined;
  const hasConditions = input.conditions !== undefined;

  if (!hasLineItems && !hasApprovals && !hasSpecs && !hasConditions) {
    return { status: "error", message: "Keine Änderungen übergeben." };
  }

  const lineItems = hasLineItems
    ? parseLineItems(input.lineItems) ??
      (Array.isArray(input.lineItems) && input.lineItems.length === 0
        ? []
        : null)
    : undefined;
  const vehicleApprovals = hasApprovals
    ? parseStringList(input.vehicleApprovals) ??
      (Array.isArray(input.vehicleApprovals) &&
      input.vehicleApprovals.length === 0
        ? []
        : null)
    : undefined;
  const technicalSpecs = hasSpecs
    ? parseTechnicalSpecs(input.technicalSpecs) ??
      (Array.isArray(input.technicalSpecs) &&
      input.technicalSpecs.length === 0
        ? []
        : null)
    : undefined;
  const conditions = hasConditions
    ? parseAbeConditions(input.conditions) ??
      (Array.isArray(input.conditions) && input.conditions.length === 0
        ? []
        : null)
    : undefined;

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
    await updateMockUploadedDocument(vehicleId, documentId, {
      ...(lineItems !== undefined ? { line_items: lineItems } : {}),
      ...(vehicleApprovals !== undefined
        ? { vehicle_approvals: vehicleApprovals }
        : {}),
      ...(technicalSpecs !== undefined
        ? { technical_specs: technicalSpecs }
        : {}),
      ...(conditions !== undefined ? { conditions } : {}),
    });
    revalidateDocumentPaths(tagUuid, documentId);
    return { status: "ok" };
  }

  const user = await getCurrentUser();
  if (!user) {
    return { status: "error", message: "Nicht angemeldet." };
  }

  const writeAccess = await getVehicleWriteAccess(vehicleId, user.id);
  if (!writeAccess.ok) {
    return { status: "error", message: "Kein Schreibzugriff auf dieses Fahrzeug." };
  }

  if (!isSupabaseAdminConfigured()) {
    return { status: "error", message: "SUPABASE_SERVICE_ROLE_KEY fehlt." };
  }

  const admin = createAdminClient();
  const { data: document, error: loadError } = await admin
    .from("documents")
    .select("id, type, vehicle_id")
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
      message: "Schrauber können nur Rechnungspositionen bearbeiten.",
    };
  }

  // ABE list fields stay owner-only.
  if (
    writeAccess.isContributor &&
    !writeAccess.isOwner &&
    (hasApprovals || hasSpecs || hasConditions)
  ) {
    return {
      status: "error",
      message: "ABE-Felder kann nur der Eigentümer ändern.",
    };
  }

  const patch: Record<string, unknown> = {};
  if (lineItems !== undefined) {
    patch.line_items = lineItems && lineItems.length > 0 ? lineItems : null;
  }
  if (vehicleApprovals !== undefined) {
    patch.vehicle_approvals =
      vehicleApprovals && vehicleApprovals.length > 0
        ? vehicleApprovals
        : null;
  }
  if (technicalSpecs !== undefined) {
    patch.technical_specs =
      technicalSpecs && technicalSpecs.length > 0 ? technicalSpecs : null;
  }
  if (conditions !== undefined) {
    patch.conditions =
      conditions && conditions.length > 0 ? conditions : null;
  }

  const { error: updateError } = await admin
    .from("documents")
    .update(patch)
    .eq("id", documentId)
    .eq("vehicle_id", vehicleId);

  if (updateError) {
    return { status: "error", message: updateError.message };
  }

  revalidateDocumentPaths(tagUuid, documentId);
  return { status: "ok" };
}
