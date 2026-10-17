import type { TopThreeWeeklyRank } from "@/lib/showcase/vehicle-weekly-showcase-rank-helpers";

export function weeklyRankAwardEmailReminderKey(
  weekKey: string,
  vehicleId: string,
  rank: TopThreeWeeklyRank,
): string {
  return `weekly_rank_award:${weekKey.trim()}:${vehicleId.trim()}:r${rank}`;
}

export function weeklyRankAwardHeadline(rank: TopThreeWeeklyRank): string {
  switch (rank) {
    case 1:
      return "Build der Woche";
    case 2:
      return "Platz 2 der Woche";
    case 3:
      return "Top 3 der Woche";
    default:
      return "Build der Woche";
  }
}

export function weeklyRankAwardEmailSubject(
  rank: TopThreeWeeklyRank,
  vehicleLabel: string,
): string {
  const headline = weeklyRankAwardHeadline(rank);
  return `${headline} — ${vehicleLabel}`;
}
