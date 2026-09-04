import "server-only";

import { getCurrentUser } from "@/lib/auth/get-user";
import {
  getTagVehicleAccess,
  userHasInsiderVehicleAccess,
  type VehicleAccess,
} from "@/lib/auth/vehicle-access";
import { isDemoActiveTag } from "@/lib/tags/demo-showcase";
import { getActiveTagUuidForVehicle } from "@/lib/tags/get-active-tag-uuid-for-vehicle";
import { MOCK_TAG_UUIDS } from "@/lib/tags/mock-tags";
import { isPlaqueTagUuid } from "@/lib/tags/plaque-qr";
import { resolvePublicVehicleEntry } from "@/lib/vehicles/get-public-vehicle";

const VEHICLE_PATH_RE = /^\/v\/([^/?#]+)(.*)$/;

function hasInsiderAccess(access: VehicleAccess): boolean {
  return access.isOwner || access.isContributor;
}

function isPhysicalTagIdentifier(identifier: string): boolean {
  const id = identifier.trim();
  if (!id) return true;
  if (isDemoActiveTag(id) || id === MOCK_TAG_UUIDS.unclaimed) return true;
  return isPlaqueTagUuid(id);
}

/**
 * Map `/v/{public_slug}` → `/v/{tagUuid}` for owners and Schrauber.
 * Physical tag UUIDs are unchanged (page handles access there).
 */
export async function resolveInsiderVehiclePath(
  path: string,
  userId?: string | null,
): Promise<string | null> {
  const trimmed = path.trim();
  const match = trimmed.match(VEHICLE_PATH_RE);
  if (!match) return null;

  const identifier = match[1]?.trim();
  if (!identifier || isPhysicalTagIdentifier(identifier)) return null;

  const entry = await resolvePublicVehicleEntry(identifier);
  if (entry?.kind !== "slug") return null;

  const { vehicle } = entry;
  const tagUuid = await getActiveTagUuidForVehicle(vehicle.id);
  if (!tagUuid) return null;

  const sessionUserId = userId?.trim() || null;
  const allowed = sessionUserId
    ? await userHasInsiderVehicleAccess(sessionUserId, tagUuid, vehicle.id)
    : hasInsiderAccess(
        await getTagVehicleAccess(
          tagUuid,
          vehicle.user_id?.trim() || null,
          vehicle.id,
        ),
      );

  if (!allowed) return null;

  const suffix = match[2] ?? "";
  return `/v/${tagUuid}${suffix}`;
}

/** Session-based slug → tag redirect (page loads with cookies committed). */
export async function resolveInsiderVehiclePathForSession(
  path: string,
): Promise<string | null> {
  const session = await getCurrentUser();
  if (!session?.id) return null;
  return resolveInsiderVehiclePath(path, session.id);
}
