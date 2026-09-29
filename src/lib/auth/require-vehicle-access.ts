import { notFound, redirect } from "next/navigation";

import { filterDocumentsForContributorAccess } from "@/lib/auth/contributor-document-access";
import {
  getTagVehicleAccess,
  getVehicleAccess,
  type VehicleAccess,
} from "@/lib/auth/vehicle-access";
import type { TagLoadOptions } from "@/lib/tags/get-tag-by-uuid";
import {
  demoShowcaseAccess,
  isDemoActiveTag,
} from "@/lib/tags/demo-showcase";
import {
  loadVehicleSurfaceByTagUuid,
  loadVehicleSurfaceByVehicleId,
} from "@/lib/vehicle-surface/load-vehicle-for-surface";
import {
  garagePathForVehicle,
  vehicleSurfaceHref,
} from "@/lib/vehicle-surface/paths";
import type { VehicleSurfaceScope } from "@/lib/vehicle-surface/types";
import type { TagScanResult } from "@/types/database";

export type VehicleSurfaceAccessContext = {
  scope: VehicleSurfaceScope;
  result: TagScanResult;
  access: VehicleAccess;
  isDemoShowcase?: boolean;
};

function loginNextForScope(
  scope: VehicleSurfaceScope,
  segment?: string,
): string {
  return vehicleSurfaceHref(scope, segment);
}

export async function requireVehicleSurfaceOwner(
  ref: { tagUuid: string } | { vehicleId: string },
  options?: { loginNext?: string; load?: TagLoadOptions; pathSegment?: string },
): Promise<VehicleSurfaceAccessContext> {
  const loaded =
    "tagUuid" in ref
      ? await loadVehicleSurfaceByTagUuid(ref.tagUuid, options?.load)
      : await loadVehicleSurfaceByVehicleId(ref.vehicleId, options?.load);

  if (!loaded?.result.vehicle) {
    notFound();
  }

  const { scope, result } = loaded;
  const vehicle = result.vehicle!;

  if ("tagUuid" in ref && isDemoActiveTag(ref.tagUuid)) {
    return {
      scope,
      result,
      access: demoShowcaseAccess(),
      isDemoShowcase: true,
    };
  }

  const tagUuidForAccess =
    scope.linkedTagUuid ??
    ("tagUuid" in ref ? ref.tagUuid : "");
  const access = tagUuidForAccess
    ? await getTagVehicleAccess(
        tagUuidForAccess,
        vehicle.user_id,
        vehicle.id,
      )
    : await getVehicleAccess(vehicle.user_id, vehicle.id);

  if (!access.isOwner) {
    const loginNext =
      options?.loginNext ??
      loginNextForScope(scope, options?.pathSegment);
    if (!access.sessionUserId) {
      redirect(`/login?next=${encodeURIComponent(loginNext)}`);
    }
    if (scope.linkedTagUuid) {
      redirect(`/v/${scope.linkedTagUuid}`);
    }
    redirect(garagePathForVehicle(scope.vehicleId, options?.pathSegment));
  }

  return { scope, result, access };
}

export async function requireVehicleSurfaceWriter(
  ref: { tagUuid: string } | { vehicleId: string },
  options?: { loginNext?: string; load?: TagLoadOptions; pathSegment?: string },
): Promise<VehicleSurfaceAccessContext> {
  const loaded =
    "tagUuid" in ref
      ? await loadVehicleSurfaceByTagUuid(ref.tagUuid, options?.load)
      : await loadVehicleSurfaceByVehicleId(ref.vehicleId, options?.load);

  if (!loaded?.result.vehicle) {
    notFound();
  }

  const { scope, result } = loaded;
  const vehicle = result.vehicle!;

  if ("tagUuid" in ref && isDemoActiveTag(ref.tagUuid)) {
    return {
      scope,
      result,
      access: demoShowcaseAccess(),
      isDemoShowcase: true,
    };
  }

  const tagUuidForAccess = scope.linkedTagUuid ?? ("tagUuid" in ref ? ref.tagUuid : "");
  const access = tagUuidForAccess
    ? await getTagVehicleAccess(
        tagUuidForAccess,
        vehicle.user_id,
        vehicle.id,
      )
    : await getVehicleAccess(vehicle.user_id, vehicle.id);

  if (!access.canWriteInvoices) {
    const loginNext =
      options?.loginNext ??
      loginNextForScope(scope, options?.pathSegment);
    if (!access.sessionUserId) {
      redirect(`/login?next=${encodeURIComponent(loginNext)}`);
    }
    if (scope.linkedTagUuid) {
      redirect(`/v/${scope.linkedTagUuid}`);
    }
    redirect(garagePathForVehicle(scope.vehicleId, options?.pathSegment));
  }

  const documents = filterDocumentsForContributorAccess(result.documents, {
    isOwner: access.isOwner,
    isContributor: access.isContributor,
    canReadHistory: access.canReadHistory,
    sessionUserId: access.sessionUserId,
  });

  return {
    scope,
    result: { ...result, documents },
    access,
  };
}
