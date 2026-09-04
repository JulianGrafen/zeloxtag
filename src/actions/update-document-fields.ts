"use server";

import { revalidatePath } from "next/cache";

import {
  contributorMayWriteDocumentType,
  getVehicleWriteAccess,
  writeAccessErrorMessage,
} from "@/lib/auth/vehicle-write-access";
import { getCurrentUser } from "@/lib/auth/get-user";
import { FEATURE } from "@/lib/permissions/feature-access";
import { featureDeniedToForbidden } from "@/lib/permissions/feature-gate-result";
import type { FeatureForbiddenResult } from "@/lib/permissions/feature-gate-result";
import { assertOwnerFeature, assertVehicleDocumentWrite } from "@/lib/permissions/require-feature";
import { parseLineItems, sumLineItems } from "@/lib/documents/line-items";
import {
  isManualEntryMarker,
  isManualEntryUrl,
} from "@/lib/documents/manual-entries";
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
  | FeatureForbiddenResult
  | { status: "error"; message: string };

type UpdatePayload = {
  documentId: string;
  vehicleId: string;
  tagUuid: string;
  lineItems?: DocumentLineItem[] | null;
  vehicleApprovals?: string[] | null;
  technicalSpecs?: DocumentTechnicalSpec[] | null;
  conditions?: string[] | null;
  vendor?: string | null;
  title?: string | null;
};

const MAX_VENDOR_LENGTH = 160;
const MAX_TITLE_LENGTH = 160;

function parseVendor(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim().slice(0, MAX_VENDOR_LENGTH);
  return trimmed.length > 0 ? trimmed : null;
}

function parseTitle(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || typeof value !== "string") return null;
  const trimmed = value.trim().slice(0, MAX_TITLE_LENGTH);
  return trimmed.length > 0 ? trimmed : null;
}

function revalidateDocumentPaths(tagUuid: string, documentId: string) {
  revalidatePath(`/v/${tagUuid}`);
  revalidatePath(`/v/${tagUuid}/dokumente`);
  revalidatePath(`/v/${tagUuid}/dokumente/${documentId}`);
  revalidatePath(`/v/${tagUuid}/service`);
  revalidatePath(`/v/${tagUuid}/historie`);
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
  const hasVendor = input.vendor !== undefined;
  const hasTitle = input.title !== undefined;

  if (
    !hasLineItems &&
    !hasApprovals &&
    !hasSpecs &&
    !hasConditions &&
    !hasVendor &&
    !hasTitle
  ) {
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
  const vendor = hasVendor ? parseVendor(input.vendor) : undefined;
  const title = hasTitle ? parseTitle(input.title) : undefined;

  if (hasTitle && !title) {
    return { status: "error", message: "Titel ist erforderlich." };
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
    const mockPatch: Record<string, unknown> = {};
    if (lineItems !== undefined) {
      mockPatch.line_items = lineItems;
      const total = sumLineItems(lineItems);
      if (total !== null && total > 0) {
        mockPatch.amount = total;
      }
    }
    await updateMockUploadedDocument(vehicleId, documentId, {
      ...mockPatch,
      ...(vehicleApprovals !== undefined
        ? { vehicle_approvals: vehicleApprovals }
        : {}),
      ...(technicalSpecs !== undefined
        ? { technical_specs: technicalSpecs }
        : {}),
      ...(conditions !== undefined ? { conditions } : {}),
      ...(vendor !== undefined ? { vendor } : {}),
      ...(typeof title === "string" ? { title } : {}),
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
    return { status: "error", message: writeAccessErrorMessage(writeAccess) };
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
  if (!document) {
    return { status: "error", message: "Dokument nicht gefunden." };
  }

  if (writeAccess.ownerUserId) {
    const manual =
      isManualEntryMarker(document.invoice_number) ||
      isManualEntryUrl(document.file_url);
    const gate = manual
      ? await assertOwnerFeature(
          writeAccess.ownerUserId,
          FEATURE.ADD_MANUAL_SERVICE_ENTRY,
        )
      : await assertVehicleDocumentWrite(
          writeAccess,
          FEATURE.DOCUMENT_VAULT,
        );
    if (!gate.ok) {
      return featureDeniedToForbidden(gate);
    }
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
    const total = sumLineItems(lineItems);
    if (total !== null && total > 0) {
      patch.amount = total;
    }
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
  if (vendor !== undefined) {
    patch.vendor = vendor;
  }
  if (title !== undefined) {
    patch.title = title;
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
