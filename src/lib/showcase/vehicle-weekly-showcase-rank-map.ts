export type VehicleWeeklyShowcaseRank = {
  rank: number;
  weeklyLikes: number;
};

export type VehicleWeeklyShowcaseRankRow = {
  rank: number;
  weekly_likes: number;
};

export function mapVehicleWeeklyShowcaseRankRow(
  row: unknown,
): VehicleWeeklyShowcaseRank | null {
  if (!row || typeof row !== "object") return null;

  const record = row as VehicleWeeklyShowcaseRankRow;
  const rank = Math.floor(Number(record.rank));
  const weeklyLikes = Math.floor(Number(record.weekly_likes));

  if (!Number.isFinite(rank) || !Number.isFinite(weeklyLikes)) {
    return null;
  }
  if (rank < 1 || weeklyLikes < 1) {
    return null;
  }

  return { rank, weeklyLikes };
}
