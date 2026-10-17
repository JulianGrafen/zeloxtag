import "server-only";

import { buildOwnerShareableBuildData } from "@/lib/showcase/build-owner-shareable-build-data";
import type { ShowcaseWeeklyRankAward } from "@/lib/showcase/weekly-rank-award-types";
import {
  isTopThreeRank,
  type TopThreeWeeklyRank,
} from "@/lib/showcase/vehicle-weekly-showcase-rank-helpers";
import { createClient } from "@/lib/supabase/server";
import type { Document, Vehicle } from "@/types/database";

import type { ShareableBuildData } from "@/components/shareable-spec-card/types";

type AwardRow = {
  id: string;
  vehicle_id: string;
  week_key: string;
  rank: number;
  weekly_likes: number;
  created_at: string;
};

function mapAwardRow(row: AwardRow): ShowcaseWeeklyRankAward | null {
  if (!isTopThreeRank(row.rank)) return null;
  return {
    id: row.id,
    vehicleId: row.vehicle_id,
    weekKey: row.week_key,
    rank: row.rank as TopThreeWeeklyRank,
    weeklyLikes: Math.max(1, Math.floor(row.weekly_likes)),
    createdAt: row.created_at,
  };
}

export type WeeklyRankAwardCelebration = {
  award: ShowcaseWeeklyRankAward;
  shareCardData: ShareableBuildData;
};

export async function loadPendingWeeklyRankAwardForUser(
  userId: string,
): Promise<WeeklyRankAwardCelebration | null> {
  const supabase = await createClient();
  const { data: awardRow, error } = await supabase
    .from("showcase_weekly_rank_awards")
    .select("id, vehicle_id, week_key, rank, weekly_likes, created_at")
    .eq("user_id", userId)
    .is("seen_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !awardRow) return null;

  const award = mapAwardRow(awardRow as AwardRow);
  if (!award) return null;

  const { data: vehicle, error: vehicleError } = await supabase
    .from("vehicles")
    .select("*")
    .eq("id", award.vehicleId)
    .eq("user_id", userId)
    .maybeSingle();

  if (vehicleError || !vehicle) return null;

  const { data: documents } = await supabase
    .from("documents")
    .select("*")
    .eq("vehicle_id", award.vehicleId)
    .eq("show_on_public_showcase", true)
    .limit(40);

  const shareCardData = buildOwnerShareableBuildData(
    vehicle as Vehicle,
    (documents ?? []) as Document[],
    { rank: award.rank, weeklyLikes: award.weeklyLikes },
  );

  if (!shareCardData) return null;

  return { award, shareCardData };
}

export async function loadPendingWeeklyRankAwardForVehicle(
  userId: string,
  vehicleId: string,
): Promise<WeeklyRankAwardCelebration | null> {
  const celebration = await loadPendingWeeklyRankAwardForUser(userId);
  if (!celebration || celebration.award.vehicleId !== vehicleId.trim()) {
    return null;
  }
  return celebration;
}

export async function markWeeklyRankAwardSeen(
  userId: string,
  awardId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("showcase_weekly_rank_awards")
    .update({ seen_at: now })
    .eq("id", awardId)
    .eq("user_id", userId)
    .is("seen_at", null)
    .select("id")
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }
  if (!data?.id) {
    return { ok: false, error: "Award nicht gefunden." };
  }
  return { ok: true };
}
