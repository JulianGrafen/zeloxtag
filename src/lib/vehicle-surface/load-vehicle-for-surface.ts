import "server-only";

import { cache } from "react";

import { getCurrentUser } from "@/lib/auth/get-user";
import { getActiveTagUuidForVehicle } from "@/lib/tags/get-active-tag-uuid-for-vehicle";
import {
  getTagByUuid,
  hydrateTagScanWithSessionDocuments,
  type TagLoadOptions,
} from "@/lib/tags/get-tag-by-uuid";
import { loadVehicleProjectionMaybeSingle } from "@/lib/vehicles/load-vehicle-projection";
import { createClient } from "@/lib/supabase/server";
import type { TagScanResult } from "@/types/database";

import type { VehicleSurfaceScope } from "./types";

export type VehicleSurfaceLoad = {
  scope: VehicleSurfaceScope;
  result: TagScanResult;
};

async function loadVehicleScanByVehicleIdUncached(
  vehicleId: string,
  load?: TagLoadOptions,
): Promise<TagScanResult | null> {
  const supabase = await createClient();
  const { data: vehicle, error } = await loadVehicleProjectionMaybeSingle(
    supabase.from("vehicles"),
    { column: "id", value: vehicleId },
  );

  if (error || !vehicle) {
    return null;
  }

  const linkedTagUuid = await getActiveTagUuidForVehicle(vehicle.id);
  if (linkedTagUuid) {
    const tagged = await getTagByUuid(linkedTagUuid, load);
    if (tagged?.vehicle?.id === vehicle.id) {
      return tagged;
    }
  }

  const placeholderTag = {
    id: `digital-${vehicle.id}`,
    uuid: linkedTagUuid ?? `digital-${vehicle.id}`,
    vehicle_id: vehicle.id,
    status: linkedTagUuid ? ("active" as const) : ("unclaimed" as const),
    created_at: vehicle.created_at,
    updated_at: vehicle.updated_at,
  };

  const taggedLoad = linkedTagUuid
    ? await getTagByUuid(linkedTagUuid, load)
    : null;

  const baseScan = {
    tag: linkedTagUuid && taggedLoad ? taggedLoad.tag : placeholderTag,
    vehicle,
    documents: taggedLoad?.documents ?? [],
  };

  const viewer = await getCurrentUser();
  if (!viewer) {
    return baseScan;
  }

  return hydrateTagScanWithSessionDocuments(
    baseScan,
    load?.documents ?? { mode: "all", columns: "list" },
  );
}

const loadVehicleScanByVehicleId = cache(loadVehicleScanByVehicleIdUncached);

export async function loadVehicleSurfaceByTagUuid(
  tagUuid: string,
  load?: TagLoadOptions,
): Promise<VehicleSurfaceLoad | null> {
  const result = await getTagByUuid(tagUuid, load);
  if (!result?.vehicle || result.tag.status !== "active") {
    return null;
  }

  return {
    scope: {
      vehicleId: result.vehicle.id,
      linkedTagUuid: result.tag.uuid,
    },
    result,
  };
}

export async function loadVehicleSurfaceByVehicleId(
  vehicleId: string,
  load?: TagLoadOptions,
): Promise<VehicleSurfaceLoad | null> {
  const result = await loadVehicleScanByVehicleId(vehicleId, load);
  if (!result?.vehicle) {
    return null;
  }

  const linkedTagUuid = await getActiveTagUuidForVehicle(result.vehicle.id);

  return {
    scope: {
      vehicleId: result.vehicle.id,
      linkedTagUuid,
    },
    result,
  };
}
