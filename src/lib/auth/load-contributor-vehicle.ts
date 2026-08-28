import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Vehicle } from "@/types/database";

import { withDefaultShowcaseFields } from "@/lib/vehicles/public-showcase-data";
import { parseVehicleTechSpecs } from "@/lib/vehicles/tech-specs";

function normalizeContributorVehicle(value: unknown): Vehicle | null {
  if (!value || typeof value !== "object") return null;
  const vehicle = value as Vehicle;
  if (typeof vehicle.id !== "string" || typeof vehicle.make !== "string") {
    return null;
  }

  return withDefaultShowcaseFields({
    ...vehicle,
    user_id: "",
    vin: null,
    expose_token: null,
    is_expose_active: false,
    public_slug: null,
    model: typeof vehicle.model === "string" ? vehicle.model : "",
    year: typeof vehicle.year === "number" ? vehicle.year : null,
    tech_specs: parseVehicleTechSpecs(vehicle.tech_specs),
    silhouette_image_url:
      typeof vehicle.silhouette_image_url === "string"
        ? vehicle.silhouette_image_url
        : null,
    created_at:
      typeof vehicle.created_at === "string" ? vehicle.created_at : "",
    updated_at:
      typeof vehicle.updated_at === "string" ? vehicle.updated_at : "",
  });
}

/**
 * Session-safe vehicle load for active Schrauber (RLS blocks direct table SELECT).
 */
export async function loadContributorVehicle(
  vehicleId: string,
): Promise<Vehicle | null> {
  const id = vehicleId.trim();
  if (!id) return null;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("resolve_contributor_vehicle", {
    p_vehicle_id: id,
  });

  if (error) {
    console.error("[contributor-vehicle] rpc failed", error.message);
    return null;
  }

  return normalizeContributorVehicle(data);
}
