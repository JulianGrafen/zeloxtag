import { formatPublicVehicleTitle } from "@/lib/vehicles/format-public-vehicle-title";

import type { GarageVehicle } from "./types";

type VehicleJoinRow = {
  id: string;
  make: string;
  model: string;
  year: number | null;
  created_at?: string;
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

/** Maps PostgREST tag+vehicle join rows into sorted garage entries. */
export function mapGarageRows(rows: TagGarageRow[] | null | undefined): GarageVehicle[] {
  if (!rows?.length) return [];

  const mapped: GarageVehicle[] = [];
  for (const row of rows) {
    const vehicle = singleVehicle(row.vehicles);
    if (!vehicle?.id || !row.uuid?.trim()) continue;
    const make = typeof vehicle.make === "string" ? vehicle.make : "";
    const model = typeof vehicle.model === "string" ? vehicle.model : "";
    mapped.push({
      vehicleId: vehicle.id,
      tagUuid: row.uuid.trim(),
      make,
      model,
      year:
        typeof vehicle.year === "number" && Number.isFinite(vehicle.year)
          ? vehicle.year
          : null,
      label: formatPublicVehicleTitle(make, model) || "Fahrzeug",
    });
  }

  return mapped;
}
