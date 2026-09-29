import { formatPublicVehicleTitle } from "@/lib/vehicles/format-public-vehicle-title";

import { garageVehicleImageSrc } from "./garage-vehicle-image";
import type { GarageVehicle } from "./types";

type VehicleJoinRow = {
  id: string;
  make: string;
  model: string;
  year: number | null;
  created_at?: string;
  silhouette_image_url?: string | null;
  updated_at?: string | null;
};

type TagJoinRow = {
  uuid: string;
  status: string;
};

type VehicleGarageRow = VehicleJoinRow & {
  tags: TagJoinRow | TagJoinRow[] | null;
};

type TagGarageRow = {
  uuid: string;
  vehicle_id: string | null;
  vehicles: VehicleJoinRow | VehicleJoinRow[] | null;
};

function singleVehicle(
  joined: VehicleJoinRow | VehicleJoinRow[] | null,
): VehicleJoinRow | null {
  if (!joined) return null;
  return Array.isArray(joined) ? (joined[0] ?? null) : joined;
}

function activeTagUuidFromJoin(
  tags: TagJoinRow | TagJoinRow[] | null,
): string | null {
  if (!tags) return null;
  const list = Array.isArray(tags) ? tags : [tags];
  for (const tag of list) {
    if (tag?.status === "active" && tag.uuid?.trim()) {
      return tag.uuid.trim();
    }
  }
  return null;
}

function mapVehicleRow(vehicle: VehicleJoinRow, tagUuid: string | null): GarageVehicle {
  const make = typeof vehicle.make === "string" ? vehicle.make : "";
  const model = typeof vehicle.model === "string" ? vehicle.model : "";
  const label = formatPublicVehicleTitle(make, model) || "Fahrzeug";
  const imageSrc = garageVehicleImageSrc({
    vehicleId: vehicle.id,
    make,
    model,
    silhouetteImageUrl: vehicle.silhouette_image_url,
    silhouetteCacheBust: vehicle.updated_at,
  });

  return {
    vehicleId: vehicle.id,
    tagUuid,
    make,
    model,
    year:
      typeof vehicle.year === "number" && Number.isFinite(vehicle.year)
        ? vehicle.year
        : null,
    label,
    imageSrc,
    imageAlt: label,
  };
}

/** Maps vehicles + optional active tags (digital garage). */
export function mapGarageVehicleRows(
  rows: VehicleGarageRow[] | null | undefined,
): GarageVehicle[] {
  if (!rows?.length) return [];

  const mapped: GarageVehicle[] = [];
  for (const row of rows) {
    if (!row?.id) continue;
    const tagUuid = activeTagUuidFromJoin(row.tags);
    mapped.push(mapVehicleRow(row, tagUuid));
  }

  return mapped;
}

/** Maps PostgREST tag+vehicle join rows into sorted garage entries. */
export function mapGarageRows(rows: TagGarageRow[] | null | undefined): GarageVehicle[] {
  if (!rows?.length) return [];

  const mapped: GarageVehicle[] = [];
  for (const row of rows) {
    const vehicle = singleVehicle(row.vehicles);
    if (!vehicle?.id) continue;
    const tagUuid = row.uuid?.trim() || null;
    mapped.push(mapVehicleRow(vehicle, tagUuid));
  }

  return mapped;
}
