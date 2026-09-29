import "server-only";

import { getActiveTagUuidForVehicle } from "@/lib/tags/get-active-tag-uuid-for-vehicle";

/** Build-Swipe + `/v/{public_slug}` guest showcase (no hardware tag required). */
export function canViewPublicShowcaseSlug(vehicle: {
  is_public?: boolean | null;
}): boolean {
  return Boolean(vehicle.is_public);
}

/**
 * QR `/v/{tagUuid}` guest showcase — still requires a linked active tag
 * (digital-garage builds use slug + swipe instead).
 */
export async function canResolvePublicShowcase(
  vehicleId: string,
): Promise<boolean> {
  const tagUuid = await getActiveTagUuidForVehicle(vehicleId);
  return Boolean(tagUuid?.trim());
}
