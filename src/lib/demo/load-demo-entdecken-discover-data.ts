import "server-only";

import {
  DEV_ENTDECKEN_MOCK_CARDS,
  DEV_ENTDECKEN_MOCK_WEEKLY_BUILDS,
} from "@/lib/showcase/dev-entdecken-mock";
import { loadShowcaseSwipeDeck } from "@/lib/showcase/swipe-deck";
import type { ShowcaseSwipeCard } from "@/lib/showcase/swipe-types";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { loadWeeklyTopBuilds } from "@/lib/showcase/weekly-top-builds";
import type { WeeklyTopBuild } from "@/lib/showcase/weekly-top-builds-map";

export type DemoEntdeckenDiscoverData = {
  initialCards: ShowcaseSwipeCard[];
  initialWeeklyBuilds: WeeklyTopBuild[];
  /** True when at least one list came from Supabase RPCs. */
  usesLiveCommunityData: boolean;
};

export async function loadDemoEntdeckenDiscoverData(): Promise<DemoEntdeckenDiscoverData> {
  const { isConfigured } = getSupabaseEnv();
  if (!isConfigured) {
    return {
      initialCards: DEV_ENTDECKEN_MOCK_CARDS,
      initialWeeklyBuilds: DEV_ENTDECKEN_MOCK_WEEKLY_BUILDS,
      usesLiveCommunityData: false,
    };
  }

  let initialCards: ShowcaseSwipeCard[] = [];
  let initialWeeklyBuilds: WeeklyTopBuild[] = [];

  try {
    initialCards = await loadShowcaseSwipeDeck(15);
  } catch (error) {
    console.error("[demo-entdecken] swipe deck load failed", error);
  }

  try {
    initialWeeklyBuilds = await loadWeeklyTopBuilds(10);
  } catch (error) {
    console.error("[demo-entdecken] weekly top builds load failed", error);
  }

  const usesLiveCommunityData =
    initialCards.length > 0 || initialWeeklyBuilds.length > 0;

  if (!usesLiveCommunityData) {
    return {
      initialCards: DEV_ENTDECKEN_MOCK_CARDS,
      initialWeeklyBuilds: DEV_ENTDECKEN_MOCK_WEEKLY_BUILDS,
      usesLiveCommunityData: false,
    };
  }

  return {
    initialCards,
    initialWeeklyBuilds,
    usesLiveCommunityData: true,
  };
}
