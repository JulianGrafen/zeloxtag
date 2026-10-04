import "server-only";

import {
  mapWeeklyTopBuildRow,
  type WeeklyTopBuild,
  type WeeklyTopBuildRow,
} from "@/lib/showcase/weekly-top-builds-map";
import { createClient } from "@/lib/supabase/server";

export type { WeeklyTopBuild, WeeklyTopBuildRow } from "@/lib/showcase/weekly-top-builds-map";
export { mapWeeklyTopBuildRow } from "@/lib/showcase/weekly-top-builds-map";

export async function loadWeeklyTopBuilds(
  limit = 10,
): Promise<WeeklyTopBuild[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_weekly_top_builds", {
    p_limit: limit,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!Array.isArray(data)) return [];

  const builds: WeeklyTopBuild[] = [];
  for (const entry of data) {
    if (!entry || typeof entry !== "object") continue;
    const mapped = mapWeeklyTopBuildRow(entry as WeeklyTopBuildRow);
    if (mapped) builds.push(mapped);
  }
  return builds;
}
