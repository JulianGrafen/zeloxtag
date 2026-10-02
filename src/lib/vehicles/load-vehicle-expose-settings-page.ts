import "server-only";

import { FEATURE } from "@/lib/permissions/feature-access";
import { ownerHasFeature } from "@/lib/permissions/require-feature";
import { requireVehicleSettingsOwner } from "@/lib/vehicles/require-vehicle-settings-owner";
import { getOwnerExposeState } from "@/lib/vehicles/get-public-expose";

export async function loadVehicleExposeSettingsPage(
  identifier: string,
  loginSuffix: string,
) {
  const { vehicle, isDemo, scope } = await requireVehicleSettingsOwner(
    identifier,
    {
      loginSuffix,
    },
  );
  const [expose, canUseExpose] = await Promise.all([
    getOwnerExposeState(vehicle.id),
    isDemo
      ? Promise.resolve(true)
      : ownerHasFeature(vehicle.user_id, FEATURE.GENERATE_EXPOSE),
  ]);

  return {
    vehicle,
    isDemo,
    scope,
    canUseExpose,
    exposeToken: expose.exposeToken,
    isExposeActive: expose.isExposeActive,
  };
}
