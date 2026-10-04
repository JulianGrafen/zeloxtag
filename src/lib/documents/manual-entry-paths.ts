import {
  revalidateDocumentDetailPaths,
  revalidateVehicleSurfacePaths,
  resolveRevalidationScope,
} from "@/lib/vehicle-surface/revalidate-paths";

const MANUAL_ENTRY_SEGMENTS = [
  "",
  "/eintrag",
  "/umbauten",
  "/service",
  "/dokumente",
  "/dokumente/kosten",
  "/kosten",
  "/intervalle",
  "/historie",
  "/build-planner",
] as const;

/** Revalidate surfaces that list or derive from manual vehicle entries. */
export async function revalidateManualEntryPaths(
  vehicleId: string,
  _tagUuid?: string,
  documentId?: string,
): Promise<void> {
  const scope = await resolveRevalidationScope(vehicleId);
  revalidateVehicleSurfacePaths(scope, MANUAL_ENTRY_SEGMENTS);
  if (documentId) {
    revalidateDocumentDetailPaths(scope, documentId);
  }
}
