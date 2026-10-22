import "server-only";

import { parseJsonbRpcArray } from "@/lib/showcase/parse-jsonb-rpc-array";
import {
  mapWeeklyTopBuildRow,
  type WeeklyTopBuild,
} from "@/lib/showcase/weekly-top-builds-map";
import {
  createAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/admin";

type ServiceWeeklyTopRow = {
  vehicle_id?: unknown;
  weekly_likes?: unknown;
};

/**
 * Weekly leaderboard for anonymous surfaces (demo, marketing).
 * Uses service_role RPC — `get_weekly_top_builds` requires auth.uid().
 */
export async function loadWeeklyTopBuildsPublic(
  limit = 10,
): Promise<WeeklyTopBuild[]> {
  if (!isSupabaseAdminConfigured()) {
    return [];
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("service_weekly_top_builds", {
    p_limit: limit,
  });

  if (error) {
    throw new Error(error.message);
  }

  const serviceRows = parseJsonbRpcArray(data) as ServiceWeeklyTopRow[];
  const ranked = serviceRows
    .map((row, index) => {
      const vehicleId =
        typeof row.vehicle_id === "string" ? row.vehicle_id.trim() : "";
      const weeklyLikes =
        typeof row.weekly_likes === "number"
          ? Math.max(0, Math.floor(row.weekly_likes))
          : 0;
      return { vehicleId, weeklyLikes, rank: index + 1 };
    })
    .filter((row) => row.vehicleId && row.weeklyLikes > 0);

  if (ranked.length === 0) {
    return [];
  }

  const vehicleIds = ranked.map((row) => row.vehicleId);
  const { data: vehicles, error: vehiclesError } = await admin
    .from("vehicles")
    .select(
      "id, public_slug, make, model, year, silhouette_image_url, updated_at",
    )
    .in("id", vehicleIds);

  if (vehiclesError || !vehicles?.length) {
    return [];
  }

  const vehicleById = new Map(vehicles.map((vehicle) => [vehicle.id, vehicle]));
  const builds: WeeklyTopBuild[] = [];

  for (const row of ranked) {
    const vehicle = vehicleById.get(row.vehicleId);
    const publicSlug = vehicle?.public_slug?.trim();
    if (!vehicle || !publicSlug) continue;

    const hasSilhouette = Boolean(vehicle.silhouette_image_url?.trim());
    const mapped = mapWeeklyTopBuildRow({
      rank: row.rank,
      vehicle_id: row.vehicleId,
      public_slug: publicSlug,
      make: vehicle.make ?? "",
      model: vehicle.model ?? "",
      year: vehicle.year ?? null,
      weekly_likes: row.weeklyLikes,
      has_silhouette: hasSilhouette,
      silhouette_image_url: vehicle.silhouette_image_url,
      updated_at: vehicle.updated_at,
    });
    if (mapped) builds.push(mapped);
  }

  return builds;
}
