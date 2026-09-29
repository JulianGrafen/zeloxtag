import { vehicleSurfaceBasePath } from "@/lib/vehicle-surface/paths";
import type { VehicleSurfaceScope } from "@/lib/vehicle-surface/types";

import type { GarageVehicle } from "./types";

function scopeForEntry(entry: GarageVehicle): VehicleSurfaceScope {
  return {
    vehicleId: entry.vehicleId,
    linkedTagUuid: entry.tagUuid,
  };
}

/**
 * Preserves the sub-path when switching between owned vehicles in the garage.
 */
export function garageSwitchPath(
  pathname: string,
  search: string,
  currentScope: VehicleSurfaceScope,
  nextEntry: GarageVehicle,
): string {
  const currentBase = vehicleSurfaceBasePath(currentScope);
  const nextBase = vehicleSurfaceBasePath(scopeForEntry(nextEntry));
  const base =
    pathname.startsWith(currentBase)
      ? `${nextBase}${pathname.slice(currentBase.length)}`
      : nextBase;
  return search ? `${base}${search.startsWith("?") ? search : `?${search}`}` : base;
}

/** @deprecated Use garageSwitchPath with VehicleSurfaceScope */
export function garageSwitchPathByTag(
  pathname: string,
  search: string,
  currentTagUuid: string,
  nextTagUuid: string,
): string {
  const fromPrefix = `/v/${currentTagUuid}`;
  const base =
    pathname.startsWith(fromPrefix)
      ? `/v/${nextTagUuid}${pathname.slice(fromPrefix.length)}`
      : `/v/${nextTagUuid}`;
  return search ? `${base}${search.startsWith("?") ? search : `?${search}`}` : base;
}
