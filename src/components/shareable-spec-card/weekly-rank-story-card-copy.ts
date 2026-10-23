import type { TopThreeWeeklyRank } from "@/lib/showcase/vehicle-weekly-showcase-rank-helpers";

import { weeklyRankAwardHeadline } from "@/lib/showcase/weekly-rank-award-keys";

/** Yellow kicker under the large rank numeral on weekly Story cards. */
export function weeklyRankStoryCardKicker(rank: TopThreeWeeklyRank): string {
  return weeklyRankAwardHeadline(rank);
}

export const WEEKLY_RANK_STORY_ACCENT = "#F5C518";
