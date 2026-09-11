import "server-only";

import { requireTagOwner } from "@/lib/auth/require-tag-access";
import { FEATURE } from "@/lib/permissions/feature-access";
import { ownerHasFeature } from "@/lib/permissions/require-feature";
import { isDemoActiveTag } from "@/lib/tags/demo-showcase";
import { getOwnerExposeState } from "@/lib/vehicles/get-public-expose";

export async function loadVehicleExposeSettingsPage(tagUuid: string) {
  const { result, isDemoShowcase } = await requireTagOwner(tagUuid, {
    loginNext: `/v/${tagUuid}/einstellungen`,
  });
  const vehicle = result.vehicle!;
  const isDemo = Boolean(isDemoShowcase) || isDemoActiveTag(tagUuid);
  const [expose, canUseExpose] = await Promise.all([
    getOwnerExposeState(vehicle.id),
    isDemo
      ? Promise.resolve(true)
      : ownerHasFeature(vehicle.user_id, FEATURE.GENERATE_EXPOSE),
  ]);

  return {
    vehicle,
    isDemo,
    canUseExpose,
    exposeToken: expose.exposeToken,
    isExposeActive: expose.isExposeActive,
  };
}
