"use client";

import { LegalFooterNav } from "@/components/legal/legal-footer-nav";
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
  const ownTopThreeShareCardData = buildDemoShareCardData(3);

  const experience = (
    <>
      <ShowcaseDiscoverExperience
        tagUuid={tagUuid}
        vehicleId={MOCK_DEMO_VEHICLE_ID}
        entdeckenReturnHref={entdeckenReturnHref}
        initialCards={discoverData.initialCards}
        initialWeeklyBuilds={discoverData.initialWeeklyBuilds}
        isPublic
        showcaseSwipeOptIn
        ownWeeklyRank={DEMO_ENTDECKEN_MOCK_WEEKLY_RANK}
        dailySwipeStats={DEMO_ENTDECKEN_MOCK_DAILY_STATS}
        ownTopThreeShareCardData={ownTopThreeShareCardData}
        designPreview
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
