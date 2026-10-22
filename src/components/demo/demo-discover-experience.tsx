"use client";

import { LegalFooterNav } from "@/components/legal/legal-footer-nav";
import { DiscoverBuildOfWeekHero } from "@/components/showcase-swipe/discover-minimal/DiscoverBuildOfWeekHero";
import { discoverPageRootClassName } from "@/components/showcase-swipe/discover-minimal/discover-surface-styles";
import { ShowcaseDiscoverExperience } from "@/components/showcase-swipe/showcase-discover-experience";
import { buildDemoShareCardData } from "@/lib/demo/demo-share-card-data";
import {
  DEMO_ENTDECKEN_MOCK_DAILY_STATS,
  DEMO_ENTDECKEN_MOCK_WEEKLY_RANK,
} from "@/lib/demo/demo-entdecken-mock";
import type { DemoEntdeckenDiscoverData } from "@/lib/demo/load-demo-entdecken-discover-data";
import { MOCK_DEMO_VEHICLE_ID } from "@/lib/tags/mock-tags";
import { cn } from "@/lib/utils";

function resolveDemoOwnWeeklyRank(
  discoverData: DemoEntdeckenDiscoverData,
): typeof DEMO_ENTDECKEN_MOCK_WEEKLY_RANK | null {
  if (discoverData.usesLiveCommunityData) {
    return null;
  }
  return DEMO_ENTDECKEN_MOCK_WEEKLY_RANK;
}

function resolveDemoDailySwipeStats(
  discoverData: DemoEntdeckenDiscoverData,
): typeof DEMO_ENTDECKEN_MOCK_DAILY_STATS | null {
  if (discoverData.usesLiveCommunityData) {
    return null;
  }
  return DEMO_ENTDECKEN_MOCK_DAILY_STATS;
}

type DemoDiscoverExperienceProps = {
  tagUuid: string;
  entdeckenReturnHref: string;
  discoverData: DemoEntdeckenDiscoverData;
  /** Inside VehicleSettingsSubpageShell (standalone /entdecken route). */
  embeddedInShell?: boolean;
  className?: string;
};

export function DemoDiscoverExperience({
  tagUuid,
  entdeckenReturnHref,
  discoverData,
  embeddedInShell = false,
  className,
}: DemoDiscoverExperienceProps) {
  const usesLive = discoverData.usesLiveCommunityData;
  const ownTopThreeShareCardData = usesLive
    ? null
    : buildDemoShareCardData(3);
  const ownWeeklyRank = resolveDemoOwnWeeklyRank(discoverData);
  const dailySwipeStats = resolveDemoDailySwipeStats(discoverData);

  const buildOfTheWeek = discoverData.buildOfTheWeek;

  const experience = (
    <>
      {buildOfTheWeek ? (
        <DiscoverBuildOfWeekHero
          build={buildOfTheWeek}
          entdeckenReturnHref={entdeckenReturnHref}
          className="mb-1"
        />
      ) : null}
      <ShowcaseDiscoverExperience
        tagUuid={tagUuid}
        vehicleId={usesLive ? undefined : MOCK_DEMO_VEHICLE_ID}
        entdeckenReturnHref={entdeckenReturnHref}
        initialCards={discoverData.initialCards}
        initialWeeklyBuilds={discoverData.initialWeeklyBuilds}
        isPublic
        showcaseSwipeOptIn
        ownWeeklyRank={ownWeeklyRank}
        dailySwipeStats={dailySwipeStats}
        ownTopThreeShareCardData={ownTopThreeShareCardData}
        designPreview
        leaderboardTitle={
          usesLive && discoverData.initialWeeklyBuilds.length > 0
            ? "Top Builds · diese Woche"
            : "Top Builds"
        }
      />
      <LegalFooterNav tone="inverse" className="pt-2" />
    </>
  );

  if (embeddedInShell) {
    return <div className={cn("pb-6", className)}>{experience}</div>;
  }

  return (
    <div className={cn(discoverPageRootClassName, className)}>
      <div className="px-4 pb-8 pt-2 sm:px-5">{experience}</div>
    </div>
  );
}
