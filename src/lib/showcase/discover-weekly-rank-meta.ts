import type { VehicleWeeklyShowcaseRank } from "@/lib/showcase/vehicle-weekly-showcase-rank-map";

export function formatDiscoverWeeklyRankMeta(
  weeklyRank: VehicleWeeklyShowcaseRank | null,
): string | undefined {
  if (!weeklyRank) return undefined;
  const likes =
    weeklyRank.weeklyLikes === 1
      ? "1 Like"
      : `${weeklyRank.weeklyLikes} Likes`;
  return `Platz ${weeklyRank.rank} · ${likes}`;
}
