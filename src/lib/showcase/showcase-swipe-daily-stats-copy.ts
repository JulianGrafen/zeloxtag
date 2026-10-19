import type { VehicleShowcaseSwipeDailyStats } from "@/lib/showcase/vehicle-showcase-swipe-daily-stats-map";

/** Like-rate at or above this value shows 🔥 in copy. */
export const SHOWCASE_SWIPE_DAILY_HEAT_MIN_PERCENT = 75;

export function formatShowcaseSwipeDailyStatsLine(
  stats: Pick<VehicleShowcaseSwipeDailyStats, "swipeCount" | "likeRatePercent">,
): string {
  const fireSuffix =
    stats.likeRatePercent >= SHOWCASE_SWIPE_DAILY_HEAT_MIN_PERCENT ? " 🔥" : "";

  return `Dein Auto wurde heute ${stats.swipeCount.toLocaleString("de-DE")}-mal geswiped (${stats.likeRatePercent} %${fireSuffix})`;
}
