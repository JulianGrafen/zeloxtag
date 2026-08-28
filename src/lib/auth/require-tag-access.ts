import { notFound, redirect } from "next/navigation";

import { filterDocumentsForContributorAccess } from "@/lib/auth/contributor-document-access";
import {
  getTagVehicleAccess,
  type VehicleAccess,
} from "@/lib/auth/vehicle-access";
import { getTagByUuid, type TagLoadOptions } from "@/lib/tags/get-tag-by-uuid";
import {
  demoShowcaseAccess,
  isDemoActiveTag,
} from "@/lib/tags/demo-showcase";
import type { TagScanResult } from "@/types/database";

export type TagAccessContext = {
  result: TagScanResult;
  access: VehicleAccess;
  /** Public Supra showcase — all tag surfaces browsable without login. */
  isDemoShowcase?: boolean;
};

/**
 * Owner or active Schrauber — for invoice/document write surfaces.
 */
export async function requireTagWriter(
  tagUuid: string,
  options?: { loginNext?: string; load?: TagLoadOptions },
): Promise<TagAccessContext> {
  const result = await getTagByUuid(tagUuid, options?.load);

  if (!result?.vehicle || result.tag.status !== "active") {
    notFound();
  }

  if (isDemoActiveTag(result.tag.uuid)) {
    return {
      result,
      access: demoShowcaseAccess(),
      isDemoShowcase: true,
    };
  }

  const access = await getTagVehicleAccess(
    result.tag.uuid,
    result.vehicle.user_id,
    result.vehicle.id,
  );

  if (!access.canWriteInvoices) {
    if (!access.sessionUserId) {
      const next = options?.loginNext ?? `/v/${result.tag.uuid}`;
      redirect(`/login?next=${encodeURIComponent(next)}`);
    }
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
 * Vehicle owner only — settings, Schrauber invites, basic profile.
 * Does not require ZeloxTag Pro (digital business card is free).
 */
export async function requireTagOwner(
  tagUuid: string,
  options?: { loginNext?: string },
): Promise<TagAccessContext> {
  const result = await getTagByUuid(tagUuid);

  if (!result?.vehicle || result.tag.status !== "active") {
    notFound();
  }

  if (isDemoActiveTag(result.tag.uuid)) {
    return {
      result,
      access: demoShowcaseAccess(),
      isDemoShowcase: true,
    };
  }

  const access = await getTagVehicleAccess(
    result.tag.uuid,
    result.vehicle.user_id,
    result.vehicle.id,
  );

  if (!access.isOwner) {
    if (!access.sessionUserId) {
      const next = options?.loginNext ?? `/v/${result.tag.uuid}`;
      redirect(`/login?next=${encodeURIComponent(next)}`);
    }
    redirect(`/v/${result.tag.uuid}`);
  }

  return { result, access };
}
