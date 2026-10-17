import "server-only";

import { sendWeeklyRankAwardEmail } from "@/lib/email/showcase-weekly-rank-award-email";
import { weeklyTopBuildReminderWeekKey } from "@/lib/showcase/weekly-leaderboard-logic";
import { loadWeeklyLeaderboardAdmin } from "@/lib/showcase/weekly-leaderboard-admin";
import {
  isTopThreeRank,
  type TopThreeWeeklyRank,
} from "@/lib/showcase/vehicle-weekly-showcase-rank-helpers";
import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";

export type ProcessWeeklyRankAwardsResult = {
  weekKey: string;
  processed: number;
  emailsSent: number;
  skipped: number;
};

type VehicleOwnerRow = {
  id: string;
  user_id: string;
  make: string;
  model: string;
};

async function loadVehicleOwners(
  vehicleIds: string[],
): Promise<Map<string, VehicleOwnerRow>> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("vehicles")
    .select("id, user_id, make, model")
    .in("id", vehicleIds);

  if (error || !data) {
    throw new Error(error?.message ?? "vehicles_load_failed");
  }

  const map = new Map<string, VehicleOwnerRow>();
  for (const row of data) {
    if (!row.id || !row.user_id) continue;
    map.set(row.id, row as VehicleOwnerRow);
  }
  return map;
}

export async function processWeeklyShowcaseRankAwards(options?: {
  weekKey?: string;
  limit?: number;
}): Promise<ProcessWeeklyRankAwardsResult> {
  if (!isSupabaseAdminConfigured()) {
    return { weekKey: "", processed: 0, emailsSent: 0, skipped: 0 };
  }

  const weekKey = options?.weekKey?.trim() || weeklyTopBuildReminderWeekKey();
  const limit = Math.min(Math.max(options?.limit ?? 3, 1), 3);
  const leaderboard = await loadWeeklyLeaderboardAdmin(limit);

  if (leaderboard.length === 0) {
    return { weekKey, processed: 0, emailsSent: 0, skipped: 0 };
  }

  const owners = await loadVehicleOwners(leaderboard.map((e) => e.vehicleId));
  const admin = createAdminClient();

  let processed = 0;
  let emailsSent = 0;
  let skipped = 0;

  for (let index = 0; index < leaderboard.length; index += 1) {
    const rank = index + 1;
    if (!isTopThreeRank(rank)) continue;

    const entry = leaderboard[index]!;
    const vehicle = owners.get(entry.vehicleId);
    if (!vehicle?.user_id) {
      skipped += 1;
      continue;
    }

    const { error: insertError } = await admin
      .from("showcase_weekly_rank_awards")
      .insert({
        user_id: vehicle.user_id,
        vehicle_id: vehicle.id,
        week_key: weekKey,
        rank,
        weekly_likes: entry.weeklyLikes,
      });

    if (insertError) {
      if (insertError.code === "23505") {
        skipped += 1;
      } else {
        console.error("[weekly-rank-awards] insert failed", insertError);
        skipped += 1;
      }
      continue;
    }

    processed += 1;

    const vehicleLabel = `${vehicle.make} ${vehicle.model}`.trim();
    const sent = await sendWeeklyRankAwardEmail({
      ownerUserId: vehicle.user_id,
      vehicleId: vehicle.id,
      vehicleLabel,
      weekKey,
      rank: rank as TopThreeWeeklyRank,
      weeklyLikes: entry.weeklyLikes,
    });
    if (sent) emailsSent += 1;
  }

  return { weekKey, processed, emailsSent, skipped };
}
