import "server-only";

import { loadDemoPublicDiscoverDeck } from "@/lib/demo/load-demo-public-discover-deck";
import {
  DEV_ENTDECKEN_MOCK_CARDS,
  DEV_ENTDECKEN_MOCK_WEEKLY_BUILDS,
} from "@/lib/showcase/dev-entdecken-mock";
import { loadWeeklyTopBuildsPublic } from "@/lib/showcase/load-weekly-top-builds-public";
import type { ShowcaseSwipeCard } from "@/lib/showcase/swipe-types";
import { getSupabaseEnv } from "@/lib/supabase/env";
import type { WeeklyTopBuild } from "@/lib/showcase/weekly-top-builds-map";

export type DemoEntdeckenDiscoverData = {
  initialCards: ShowcaseSwipeCard[];
  initialWeeklyBuilds: WeeklyTopBuild[];
  /** Rank #1 this week (public leaderboard), when available. */
  buildOfTheWeek: WeeklyTopBuild | null;
  /** True when at least one list came from Supabase RPCs. */
  usesLiveCommunityData: boolean;
};

export async function loadDemoEntdeckenDiscoverData(): Promise<DemoEntdeckenDiscoverData> {
  const { isConfigured } = getSupabaseEnv();
  if (!isConfigured) {
    return {
      initialCards: DEV_ENTDECKEN_MOCK_CARDS,
      initialWeeklyBuilds: DEV_ENTDECKEN_MOCK_WEEKLY_BUILDS,
      buildOfTheWeek: DEV_ENTDECKEN_MOCK_WEEKLY_BUILDS[0] ?? null,
      usesLiveCommunityData: false,
    };
  }

  let initialCards: ShowcaseSwipeCard[] = [];
  let initialWeeklyBuilds: WeeklyTopBuild[] = [];

  try {
    initialCards = await loadDemoPublicDiscoverDeck(15);
  } catch (error) {
    console.error("[demo-entdecken] public swipe deck load failed", error);
  }

  try {
    initialWeeklyBuilds = await loadWeeklyTopBuildsPublic(10);
  } catch (error) {
    console.error("[demo-entdecken] public weekly top load failed", error);
  }

  const usesLiveCommunityData =
    initialCards.length > 0 || initialWeeklyBuilds.length > 0;

  if (!usesLiveCommunityData) {
    return {
      initialCards: DEV_ENTDECKEN_MOCK_CARDS,
      initialWeeklyBuilds: DEV_ENTDECKEN_MOCK_WEEKLY_BUILDS,
      buildOfTheWeek: DEV_ENTDECKEN_MOCK_WEEKLY_BUILDS[0] ?? null,
      usesLiveCommunityData: false,
    };
  }

  return {
    initialCards,
    initialWeeklyBuilds,
    buildOfTheWeek: initialWeeklyBuilds[0] ?? null,
    usesLiveCommunityData: true,
  };
}
