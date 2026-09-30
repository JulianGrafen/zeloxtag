import {
  garagePathForVehicle,
  isVehicleId,
  vehicleSurfaceHref,
} from "@/lib/vehicle-surface/paths";
import type { VehicleSurfaceScope } from "@/lib/vehicle-surface/types";
import type { DocumentType } from "@/types/database";

/** Open a single document detail view (invoice, ABE, …). */
export function documentDetailHref(
  tagUuid: string,
  documentId: string,
  scope?: VehicleSurfaceScope,
): string {
  const id = documentId.trim();
  const segment = `dokumente/${id}`;
  if (scope) {
    return vehicleSurfaceHref(scope, segment);
  }
  if (isVehicleId(tagUuid)) {
    return garagePathForVehicle(tagUuid, segment);
  }
  return `/v/${tagUuid}/dokumente/${encodeURIComponent(id)}`;
}

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
