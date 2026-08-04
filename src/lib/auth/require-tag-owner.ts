import { notFound, redirect } from "next/navigation";

import {
  getTagVehicleAccess,
  type VehicleAccess,
} from "@/lib/auth/vehicle-access";
import { getTagByUuid } from "@/lib/tags/get-tag-by-uuid";
import type { TagScanResult } from "@/types/database";

export type TagOwnerContext = {
  result: TagScanResult;
  access: VehicleAccess;
};

/**
 * Fail-closed gate for private vehicle surfaces (Rechnungen, Intervalle, …).
 * Non-owners are sent back to the locked twin — never a document listing.
 */
export async function requireTagOwner(
  tagUuid: string,
): Promise<TagOwnerContext> {
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
