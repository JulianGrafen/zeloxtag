import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

import { mapGarageRows } from "./map-garage-rows";
import type { GarageVehicle } from "./types";

type GarageSupabase = SupabaseClient<Database>;

/**
 * Lists active tags linked to vehicles owned by the session user (RLS-scoped).
 */
export async function fetchUserGarage(
  supabase: GarageSupabase,
): Promise<GarageVehicle[]> {
  const { data, error } = await supabase
    .from("tags")
    .select(
      "uuid, vehicle_id, vehicles!inner(id, make, model, year, created_at, silhouette_image_url, updated_at)",
    )
    .eq("status", "active")
    .order("created_at", { ascending: true, foreignTable: "vehicles" });

  if (error) {
    console.error("[garage] fetch failed", error);
    return [];
  }

  return mapGarageRows(
    data as Parameters<typeof mapGarageRows>[0],
  );
}
