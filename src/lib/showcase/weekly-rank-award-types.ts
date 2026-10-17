import type { TopThreeWeeklyRank } from "@/lib/showcase/vehicle-weekly-showcase-rank-helpers";

export type ShowcaseWeeklyRankAward = {
  id: string;
  vehicleId: string;
  weekKey: string;
  rank: TopThreeWeeklyRank;
  weeklyLikes: number;
  createdAt: string;
};
