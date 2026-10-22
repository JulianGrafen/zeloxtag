"use client";

import { useCallback, useRef, useState } from "react";
import { motion } from "motion/react";

import type { ShareableBuildData } from "@/components/shareable-spec-card/types";
import { EgoStatsBar } from "@/components/showcase-swipe/discover-minimal/EgoStatsBar";
import { LeaderboardCompact } from "@/components/showcase-swipe/discover-minimal/LeaderboardCompact";
import { ShowcaseWeeklyRankCelebration } from "@/components/showcase-swipe/showcase-weekly-rank-celebration";
import { ShowcaseSwipeDeck } from "@/components/showcase-swipe/ShowcaseSwipeDeck";
import type { ShowcaseSwipeCard } from "@/lib/showcase/swipe-types";
import type { VehicleShowcaseSwipeDailyStats } from "@/lib/showcase/vehicle-showcase-swipe-daily-stats-map";
import type { VehicleWeeklyShowcaseRank } from "@/lib/showcase/vehicle-weekly-showcase-rank-map";
import { fetchWeeklyTopBuildsClient } from "@/lib/showcase/fetch-weekly-top-builds-client";
import type { ShowcaseWeeklyRankAward } from "@/lib/showcase/weekly-rank-award-types";
import type { WeeklyTopBuild } from "@/lib/showcase/weekly-top-builds-map";
import { cn } from "@/lib/utils";

const RANKINGS_REVEAL_EASE = [0.22, 1, 0.36, 1] as const;

type ShowcaseDiscoverExperienceProps = {
  tagUuid: string;
  vehicleId?: string;
  entdeckenReturnHref: string;
  initialCards?: ShowcaseSwipeCard[];
  initialWeeklyBuilds: WeeklyTopBuild[];
  isPublic: boolean;
  showcaseSwipeOptIn: boolean;
  ownWeeklyRank: VehicleWeeklyShowcaseRank | null;
  dailySwipeStats?: VehicleShowcaseSwipeDailyStats | null;
  ownTopThreeShareCardData: ShareableBuildData | null;
  weeklyRankCelebration?: {
    award: ShowcaseWeeklyRankAward;
    shareCardData: ShareableBuildData;
  } | null;
  openWeeklyAwardFromEmail?: boolean;
  designPreview?: boolean;
  leaderboardTitle?: string;
};

export function ShowcaseDiscoverExperience({
  tagUuid,
  vehicleId,
  entdeckenReturnHref,
  initialCards = [],
  initialWeeklyBuilds,
  isPublic,
  showcaseSwipeOptIn,
  ownWeeklyRank,
  dailySwipeStats = null,
  ownTopThreeShareCardData,
  weeklyRankCelebration = null,
  openWeeklyAwardFromEmail = false,
  designPreview = false,
  leaderboardTitle = "Top Builds",
}: ShowcaseDiscoverExperienceProps) {
  const [weeklyBuilds, setWeeklyBuilds] = useState(initialWeeklyBuilds);
  const [rankingsRevealed, setRankingsRevealed] = useState(false);
  const rankingsRef = useRef<HTMLDivElement>(null);
  const eligible = isPublic && showcaseSwipeOptIn;
  const showEgoBar =
    eligible &&
    (ownWeeklyRank != null ||
      dailySwipeStats != null ||
      ownTopThreeShareCardData != null);

  const onLiked = useCallback((_card: ShowcaseSwipeCard) => {
    void fetchWeeklyTopBuildsClient(10)
      .then((builds) => {
        setWeeklyBuilds(builds);
      })
      .catch((error) => {
        console.error("[entdecken] weekly top refresh failed", error);
      });
  }, []);

  const handleDeckExhausted = useCallback(() => {
    setRankingsRevealed(true);
    window.setTimeout(() => {
      rankingsRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 80);
  }, []);

  return (
    <div className="flex touch-pan-y flex-col gap-5">
      {weeklyRankCelebration ? (
        <ShowcaseWeeklyRankCelebration
          award={weeklyRankCelebration.award}
          shareCardData={weeklyRankCelebration.shareCardData}
          initiallyExpanded={openWeeklyAwardFromEmail}
          surface="discover"
        />
      ) : null}

      {showEgoBar ? (
        <EgoStatsBar
          ownWeeklyRank={eligible ? ownWeeklyRank : null}
          dailySwipeStats={eligible ? dailySwipeStats : null}
          shareCardData={ownTopThreeShareCardData}
          vehicleId={vehicleId}
        />
      ) : null}

      <motion.section
        layout
        aria-label="Builds swipen"
        className={cn("pb-2", rankingsRevealed && "pb-0")}
        transition={{ layout: { duration: 0.55, ease: RANKINGS_REVEAL_EASE } }}
      >
        <ShowcaseSwipeDeck
          tagUuid={tagUuid}
          entdeckenReturnHref={entdeckenReturnHref}
          initialCards={initialCards}
          designPreview={designPreview}
          onLiked={onLiked}
          onDeckExhausted={handleDeckExhausted}
        />
      </motion.section>

      <motion.div
        ref={rankingsRef}
        layout
        className={cn(
          "flex scroll-mt-4 flex-col",
          rankingsRevealed && "discover-rankings-reveal",
        )}
        transition={{ layout: { duration: 0.55, ease: RANKINGS_REVEAL_EASE } }}
      >
        <LeaderboardCompact
          builds={weeklyBuilds}
          entdeckenReturnHref={entdeckenReturnHref}
          ownVehicleId={vehicleId}
          title={leaderboardTitle}
        />
      </motion.div>
    </div>
  );
}
