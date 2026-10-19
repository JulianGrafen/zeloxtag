import type { TopThreeWeeklyRank } from "@/lib/showcase/vehicle-weekly-showcase-rank-helpers";

export type StoryCardOgPayload = {
  modelName: string;
  powerLabel: string;
  topMods: readonly string[];
  totalInvestedLabel: string | null;
  trustBadge: string;
  heroImageDataUri: string | null;
  weeklyRank: TopThreeWeeklyRank | null;
  modificationsCount: number;
};
