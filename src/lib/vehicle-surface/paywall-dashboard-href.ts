import {
  garagePathForVehicle,
  isVehicleId,
  vehicleSurfaceBasePath,
} from "@/lib/vehicle-surface/paths";
import type { VehicleSurfaceScope } from "@/lib/vehicle-surface/types";

export function paywallDashboardHref(
  tagUuid: string,
  vehicleSurfaceScope?: VehicleSurfaceScope,
): string {
  if (vehicleSurfaceScope) {
    return vehicleSurfaceBasePath(vehicleSurfaceScope);
  }
  if (isVehicleId(tagUuid)) {
    return garagePathForVehicle(tagUuid);
  }
  return `/v/${tagUuid}`;
}
