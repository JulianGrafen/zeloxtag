import "server-only";

import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import type { WeeklyLeaderEntry } from "@/lib/showcase/weekly-leaderboard-logic";

type ServiceWeeklyRow = {
  vehicle_id: string;
  weekly_likes: number;
};

function parseServiceWeeklyRows(data: unknown): WeeklyLeaderEntry[] {
  if (!Array.isArray(data)) return [];
  const entries: WeeklyLeaderEntry[] = [];
  for (const raw of data) {
    if (!raw || typeof raw !== "object") continue;
    const row = raw as ServiceWeeklyRow;
    const vehicleId = row.vehicle_id?.trim();
    const weeklyLikes = Math.max(0, Math.floor(row.weekly_likes ?? 0));
    if (!vehicleId || weeklyLikes <= 0) continue;
    entries.push({ vehicleId, weeklyLikes });
  }
  return entries;
}

/** Top builds by likes in the rolling 7-day window (service role). */
export async function loadWeeklyLeaderboardAdmin(
  limit = 2,
): Promise<WeeklyLeaderEntry[]> {
  if (!isSupabaseAdminConfigured()) return [];

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("service_weekly_top_builds", {
    p_limit: Math.min(Math.max(limit, 1), 10),
  });

  if (error) {
    console.error("[weekly-leaderboard] service_weekly_top_builds failed", error);
    return [];
  }

  return parseServiceWeeklyRows(data);
}
