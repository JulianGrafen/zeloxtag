import { notFound, redirect } from "next/navigation";

import { filterDocumentsForContributorAccess } from "@/lib/auth/contributor-document-access";
import {
  getTagVehicleAccess,
  type VehicleAccess,
} from "@/lib/auth/vehicle-access";
import { getTagByUuid } from "@/lib/tags/get-tag-by-uuid";
import type { TagScanResult } from "@/types/database";

export type TagAccessContext = {
  result: TagScanResult;
  access: VehicleAccess;
};

/**
 * Owner or active Schrauber — for invoice/document write surfaces.
 * Documents are already scoped for Schrauber history permissions.
 */
export async function requireTagWriter(
  tagUuid: string,
): Promise<TagAccessContext> {
  const result = await getTagByUuid(tagUuid);

  if (!result?.vehicle || result.tag.status !== "active") {
    notFound();
  }

  const access = await getTagVehicleAccess(
    result.tag.uuid,
    result.vehicle.user_id,
  );

  if (!access.canWriteInvoices) {
    redirect(`/v/${result.tag.uuid}`);
  }

  const documents = filterDocumentsForContributorAccess(result.documents, {
    isOwner: access.isOwner,
    isContributor: access.isContributor,
    canReadHistory: access.canReadHistory,
    sessionUserId: access.sessionUserId,
  });

  return {
    result: { ...result, documents },
    access,
  };
}

/**
 * Vehicle owner only — settings, Schrauber invites, ABE/TÜV management.
 */
export async function requireTagOwner(
  tagUuid: string,
): Promise<TagAccessContext> {
  const result = await getTagByUuid(tagUuid);

  if (!result?.vehicle || result.tag.status !== "active") {
    notFound();
  }

  const access = await getTagVehicleAccess(
    result.tag.uuid,
    result.vehicle.user_id,
  );

  if (!access.isOwner) {
    redirect(`/v/${result.tag.uuid}`);
  }

  return { result, access };
}
