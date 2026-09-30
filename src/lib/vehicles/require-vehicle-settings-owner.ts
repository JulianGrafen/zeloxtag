import "server-only";

import { requireTagOwner } from "@/lib/auth/require-tag-access";
import { requireVehicleSurfaceOwner } from "@/lib/auth/require-vehicle-access";
import { isDemoActiveTag } from "@/lib/tags/demo-showcase";
import type { TagLoadOptions } from "@/lib/tags/get-tag-by-uuid";
import {
  garagePathForVehicle,
  isVehicleId,
} from "@/lib/vehicle-surface/paths";
import type { VehicleSurfaceScope } from "@/lib/vehicle-surface/types";
import type { Document, Vehicle } from "@/types/database";

export type VehicleSettingsOwnerContext = {
  vehicle: Vehicle;
  scope: VehicleSurfaceScope;
  isDemoShowcase: boolean;
  isDemo: boolean;
  documents: Document[];
};

/**
 * Settings subpages accept either a physical tag UUID (`zlx-…`) or a garage
 * vehicle id (UUID v4) for account-only owners without a linked tag.
 */
export async function requireVehicleSettingsOwner(
  identifier: string,
  options: {
    /** Path after `/v/{tag}/` or garage base, e.g. `einstellungen/soundcheck`. */
    loginSuffix: string;
    load?: TagLoadOptions;
  },
): Promise<VehicleSettingsOwnerContext> {
  const id = identifier.trim();
  const suffix = options.loginSuffix.replace(/^\//, "");

  if (isVehicleId(id)) {
    const { scope, result, isDemoShowcase } = await requireVehicleSurfaceOwner(
      { vehicleId: id },
      {
        loginNext: garagePathForVehicle(id, suffix),
        load: options.load,
      },
    );
    const vehicle = result.vehicle!;
    return {
      vehicle,
      scope,
      isDemoShowcase: Boolean(isDemoShowcase),
      isDemo: Boolean(isDemoShowcase),
      documents: result.documents ?? [],
    };
  }

  const { result, isDemoShowcase } = await requireTagOwner(id, {
    loginNext: `/v/${id}/${suffix}`,
    load: options.load,
  });
  const vehicle = result.vehicle!;
  const isDemo = Boolean(isDemoShowcase) || isDemoActiveTag(id);

  return {
    vehicle,
    scope: { vehicleId: vehicle.id, linkedTagUuid: result.tag.uuid },
    isDemoShowcase: Boolean(isDemoShowcase),
    isDemo,
    documents: result.documents ?? [],
  };
}
