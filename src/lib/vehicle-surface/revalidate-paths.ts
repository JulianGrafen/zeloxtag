import "server-only";

import { revalidatePath } from "next/cache";

import { getActiveTagUuidForVehicle } from "@/lib/tags/get-active-tag-uuid-for-vehicle";
import { garagePathForVehicle } from "@/lib/vehicle-surface/paths";
import type { VehicleSurfaceScope } from "@/lib/vehicle-surface/types";

const DOCUMENT_LIST_SEGMENTS = [
  "",
  "/dokumente",
  "/historie",
  "/service",
  "/intervalle",
  "/eintrag",
  "/umbauten",
  "/rechnungen",
] as const;

const OWNER_MUTATION_SEGMENTS = [
  ...DOCUMENT_LIST_SEGMENTS,
  "/daten",
  "/einstellungen",
  "/einstellungen/profil",
  "/einstellungen/soundcheck",
  "/einstellungen/galerie",
  "/einstellungen/leistungsdiagramm",
  "/einstellungen/umbauten",
  "/tanken",
  "/kosten",
  "/dokumente/kosten",
] as const;

export async function revalidateAfterDocumentUpload(
  vehicleId: string,
): Promise<void> {
  await revalidateOwnerVehicleSurfaces(vehicleId, DOCUMENT_LIST_SEGMENTS);
}

/** Revalidate garage (and linked tag) after owner mutations. */
export async function revalidateOwnerVehicleSurfaces(
  vehicleId: string,
  segments: readonly string[] = OWNER_MUTATION_SEGMENTS,
): Promise<void> {
  const scope = await resolveRevalidationScope(vehicleId);
  revalidateVehicleSurfacePaths(scope, segments);
}

function revalidateSegments(basePath: string, segments: readonly string[]): void {
  for (const segment of segments) {
    revalidatePath(`${basePath}${segment}`);
  }
}

/** Revalidate owner surfaces for tag and/or digital garage scope. */
export function revalidateVehicleSurfacePaths(
  scope: VehicleSurfaceScope,
  segments: readonly string[] = DOCUMENT_LIST_SEGMENTS,
): void {
  revalidateSegments(garagePathForVehicle(scope.vehicleId), segments);
  if (scope.linkedTagUuid) {
    revalidateSegments(`/v/${scope.linkedTagUuid}`, segments);
  }
}

export async function resolveRevalidationScope(
  vehicleId: string,
): Promise<VehicleSurfaceScope> {
  const linkedTagUuid = await getActiveTagUuidForVehicle(vehicleId.trim());
  return { vehicleId: vehicleId.trim(), linkedTagUuid };
}

export function revalidateDocumentDetailPaths(
  scope: VehicleSurfaceScope,
  documentId: string,
): void {
  revalidateVehicleSurfacePaths(scope);
  revalidatePath(`${garagePathForVehicle(scope.vehicleId)}/dokumente/${documentId}`);
  revalidatePath(`${garagePathForVehicle(scope.vehicleId)}/intervalle/${documentId}`);
  if (scope.linkedTagUuid) {
    revalidatePath(`/v/${scope.linkedTagUuid}/dokumente/${documentId}`);
    revalidatePath(`/v/${scope.linkedTagUuid}/intervalle/${documentId}`);
  }
}
