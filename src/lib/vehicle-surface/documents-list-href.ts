import {
  garagePathForVehicle,
  isVehicleId,
  vehicleSurfaceHref,
} from "@/lib/vehicle-surface/paths";
import type { VehicleSurfaceScope } from "@/lib/vehicle-surface/types";
import type { DocumentType } from "@/types/database";

/** Post-upload / back navigation to the vehicle document list. */
export function documentsListHref(
  tagUuid: string,
  type: DocumentType,
  scope?: VehicleSurfaceScope,
): string {
  const query = `dokumente?type=${type}`;
  if (scope) {
    return vehicleSurfaceHref(scope, query);
  }
  if (isVehicleId(tagUuid)) {
    return `${garagePathForVehicle(tagUuid)}/dokumente?type=${type}`;
  }
  return `/v/${tagUuid}/dokumente?type=${type}`;
}
