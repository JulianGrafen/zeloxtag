import {
  garagePathForVehicle,
  isVehicleId,
  vehicleSurfaceHref,
  vehicleSurfaceScopeFromContext,
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

/** Invoice / Beleg list (`dokumente?type=invoice`). */
export function invoiceBelegeListHref(
  tagUuid: string,
  vehicleId: string,
  scope?: VehicleSurfaceScope,
): string {
  return documentsListHref(tagUuid, "invoice", scope, vehicleId);
}

/** Post-upload / back navigation to the vehicle document list. */
export function documentsListHref(
  tagUuid: string,
  type: DocumentType,
  scope?: VehicleSurfaceScope,
  vehicleId?: string,
): string {
  const query = `dokumente?type=${type}`;
  const resolvedScope =
    scope ??
    (vehicleId
      ? vehicleSurfaceScopeFromContext(tagUuid, vehicleId)
      : undefined);
  if (resolvedScope) {
    return vehicleSurfaceHref(resolvedScope, query);
  }
  if (isVehicleId(tagUuid)) {
    return vehicleSurfaceHref(
      { vehicleId: tagUuid.trim(), linkedTagUuid: null },
      query,
    );
  }
  return `/v/${tagUuid}/dokumente?type=${type}`;
}
