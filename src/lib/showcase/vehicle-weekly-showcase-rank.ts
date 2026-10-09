import "server-only";

import { mapVehicleWeeklyShowcaseRankRow } from "@/lib/showcase/vehicle-weekly-showcase-rank-map";
import { createClient } from "@/lib/supabase/server";

export type { VehicleWeeklyShowcaseRank } from "@/lib/showcase/vehicle-weekly-showcase-rank-map";
export { mapVehicleWeeklyShowcaseRankRow } from "@/lib/showcase/vehicle-weekly-showcase-rank-map";

export async function loadVehicleWeeklyShowcaseRank(
  vehicleId: string,
): Promise<import("@/lib/showcase/vehicle-weekly-showcase-rank-map").VehicleWeeklyShowcaseRank | null> {
  const trimmed = vehicleId.trim();
  if (!trimmed) return null;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_vehicle_weekly_showcase_rank", {
    p_vehicle_id: trimmed,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (data == null) return null;

  return mapVehicleWeeklyShowcaseRankRow(data);
}
