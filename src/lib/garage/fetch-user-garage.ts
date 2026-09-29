import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

import { mapGarageVehicleRows } from "./map-garage-rows";
import type { GarageVehicle } from "./types";

type GarageSupabase = SupabaseClient<Database>;

/**
 * Lists all vehicles owned by the session user, with optional active tag (RLS-scoped).
 */
export async function fetchUserGarage(
  supabase: GarageSupabase,
): Promise<GarageVehicle[]> {
  const { data, error } = await supabase
    .from("vehicles")
    .select(
      "id, make, model, year, created_at, silhouette_image_url, updated_at, tags(uuid, status)",
    )
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[garage] fetch failed", error);
    return [];
  }

  return mapGarageVehicleRows(
    data as Parameters<typeof mapGarageVehicleRows>[0],
  );
}
