import "server-only";

import {
  mapVehicleShowcaseSwipeDailyStatsRow,
  type VehicleShowcaseSwipeDailyStats,
} from "@/lib/showcase/vehicle-showcase-swipe-daily-stats-map";
import { createClient } from "@/lib/supabase/server";

export type { VehicleShowcaseSwipeDailyStats } from "@/lib/showcase/vehicle-showcase-swipe-daily-stats-map";
export { mapVehicleShowcaseSwipeDailyStatsRow } from "@/lib/showcase/vehicle-showcase-swipe-daily-stats-map";

export async function loadVehicleShowcaseSwipeDailyStats(
  vehicleId?: string | null,
): Promise<VehicleShowcaseSwipeDailyStats | null> {
  const supabase = await createClient();
  const trimmed = vehicleId?.trim() ?? "";

  const { data, error } = await supabase.rpc("get_vehicle_showcase_swipe_daily_stats", {
    p_vehicle_id: trimmed.length > 0 ? trimmed : null,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (data == null) return null;

  return mapVehicleShowcaseSwipeDailyStatsRow(data);
}
