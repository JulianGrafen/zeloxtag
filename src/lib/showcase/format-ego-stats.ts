import type { VehicleShowcaseSwipeDailyStats } from "@/lib/showcase/vehicle-showcase-swipe-daily-stats-map";
import type { VehicleWeeklyShowcaseRank } from "@/lib/showcase/vehicle-weekly-showcase-rank-map";

export type EgoStatsSegments = {
  rank: string | null;
  likes: string | null;
  winRate: string | null;
};

export function buildEgoStatsSegments(
  weeklyRank: VehicleWeeklyShowcaseRank | null,
  dailyStats: VehicleShowcaseSwipeDailyStats | null,
): EgoStatsSegments {
  const rank =
    weeklyRank != null && weeklyRank.rank >= 1
      ? `Platz ${weeklyRank.rank}`
      : null;

  let likes: string | null = null;
  if (weeklyRank != null && weeklyRank.weeklyLikes >= 1) {
    likes =
      weeklyRank.weeklyLikes === 1
        ? "1 Like"
        : `${weeklyRank.weeklyLikes} Likes`;
  }

  const winRate =
    dailyStats != null &&
    Number.isFinite(dailyStats.likeRatePercent) &&
    dailyStats.likeRatePercent >= 0
      ? `🔥 ${dailyStats.likeRatePercent}% Win-Rate`
      : null;

  return { rank, likes, winRate };
}

export function egoStatsDisplayParts(segments: EgoStatsSegments): string[] {
  return [segments.rank, segments.likes, segments.winRate].filter(
    (part): part is string => part != null && part.length > 0,
  );
}
