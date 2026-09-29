import "server-only";

import { getActiveTagUuidForVehicle } from "@/lib/tags/get-active-tag-uuid-for-vehicle";

/** Public Quartettkarte requires an active hardware tag on the vehicle. */
export async function canResolvePublicShowcase(
  vehicleId: string,
): Promise<boolean> {
  const tagUuid = await getActiveTagUuidForVehicle(vehicleId);
  return Boolean(tagUuid?.trim());
}
