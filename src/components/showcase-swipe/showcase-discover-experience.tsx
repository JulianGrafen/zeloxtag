"use client";

import { useCallback, useRef, useState } from "react";
import { motion } from "motion/react";

import type { ShareableBuildData } from "@/components/shareable-spec-card/types";
import { ShowcaseWeeklyRankCelebration } from "@/components/showcase-swipe/showcase-weekly-rank-celebration";
import { ShowcaseDiscoverSection } from "@/components/showcase-swipe/showcase-discover-section";
import { ShowcaseInviteFriends } from "@/components/showcase-swipe/showcase-invite-friends";
import { ShowcaseSwipeDeck } from "@/components/showcase-swipe/ShowcaseSwipeDeck";
import { ShowcaseTopThreeStoryShare } from "@/components/showcase-swipe/showcase-top-three-story-share";
import { ShowcaseSwipeDailyStatsLine } from "@/components/showcase-swipe/showcase-swipe-daily-stats-line";
import { ShowcaseWeeklyPlacement } from "@/components/showcase-swipe/showcase-weekly-placement";
import { WeeklyTopBuilds } from "@/components/showcase-swipe/weekly-top-builds";
import type { ShowcaseSwipeCard } from "@/lib/showcase/swipe-types";
import type { VehicleShowcaseSwipeDailyStats } from "@/lib/showcase/vehicle-showcase-swipe-daily-stats-map";
import type { VehicleWeeklyShowcaseRank } from "@/lib/showcase/vehicle-weekly-showcase-rank-map";
import { fetchWeeklyTopBuildsClient } from "@/lib/showcase/fetch-weekly-top-builds-client";
import { SHOWCASE_WEEKLY_LIKE_WINDOW_LABEL } from "@/lib/showcase/showcase-weekly-like-window";
import type { ShowcaseWeeklyRankAward } from "@/lib/showcase/weekly-rank-award-types";
import type { WeeklyTopBuild } from "@/lib/showcase/weekly-top-builds-map";
import { cn } from "@/lib/utils";

const RANKINGS_REVEAL_EASE = [0.22, 1, 0.36, 1] as const;

type ShowcaseDiscoverExperienceProps = {
  tagUuid: string;
  entdeckenReturnHref: string;
  initialCards?: ShowcaseSwipeCard[];
  initialWeeklyBuilds: WeeklyTopBuild[];
  isPublic: boolean;
  showcaseSwipeOptIn: boolean;
  profilSettingsHref: string;
  ownWeeklyRank: VehicleWeeklyShowcaseRank | null;
  dailySwipeStats?: VehicleShowcaseSwipeDailyStats | null;
  ownTopThreeShareCardData: ShareableBuildData | null;
  weeklyRankCelebration?: {
    award: ShowcaseWeeklyRankAward;
    shareCardData: ShareableBuildData;
  } | null;
  openWeeklyAwardFromEmail?: boolean;
  /** When set, page header already shows Platz · Likes — placement stays slim. */
  weeklyRankShownInHeader?: boolean;
};

export function ShowcaseDiscoverExperience({
  tagUuid,
  entdeckenReturnHref,
  initialCards = [],
  initialWeeklyBuilds,
  isPublic,
  showcaseSwipeOptIn,
  profilSettingsHref,
  ownWeeklyRank,
  dailySwipeStats = null,
  ownTopThreeShareCardData,
  weeklyRankCelebration = null,
  openWeeklyAwardFromEmail = false,
  weeklyRankShownInHeader = false,
}: ShowcaseDiscoverExperienceProps) {
  const [weeklyBuilds, setWeeklyBuilds] = useState(initialWeeklyBuilds);
  const [rankingsRevealed, setRankingsRevealed] = useState(false);
  const rankingsRef = useRef<HTMLDivElement>(null);
  const eligible = isPublic && showcaseSwipeOptIn;

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

  const showRankingGroup = eligible || ownTopThreeShareCardData != null;

  return (
    <div className="flex flex-col gap-8">
      {weeklyRankCelebration ? (
        <ShowcaseWeeklyRankCelebration
          award={weeklyRankCelebration.award}
          shareCardData={weeklyRankCelebration.shareCardData}
          initiallyExpanded={openWeeklyAwardFromEmail}
        />
      ) : null}

      <motion.section
        layout
        aria-label="Builds swipen"
        className={cn("pb-2", rankingsRevealed && "pb-0")}
        transition={{ layout: { duration: 0.55, ease: RANKINGS_REVEAL_EASE } }}
      >
        {eligible && dailySwipeStats ? (
          <ShowcaseSwipeDailyStatsLine stats={dailySwipeStats} className="mb-4" />
        ) : null}
        <ShowcaseSwipeDeck
          tagUuid={tagUuid}
          entdeckenReturnHref={entdeckenReturnHref}
          initialCards={initialCards}
          onLiked={onLiked}
          onDeckExhausted={handleDeckExhausted}
        />
      </motion.section>

      <motion.div
        ref={rankingsRef}
        layout
        className={cn(
          "flex scroll-mt-4 flex-col gap-8",
          rankingsRevealed && "discover-rankings-reveal",
        )}
        transition={{ layout: { duration: 0.55, ease: RANKINGS_REVEAL_EASE } }}
      >
        {showRankingGroup ? (
          <ShowcaseDiscoverSection
            title="Dein Ranking"
            subtitle={
              eligible
                ? "Wochenplatzierung und Story teilen"
                : undefined
            }
            className="space-y-3"
          >
            <div
              className={cn(
                "flex flex-col gap-3",
                eligible &&
                  "rounded-2xl border border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)]/40 p-1",
              )}
            >
              {eligible ? (
                <ShowcaseWeeklyPlacement
                  isPublic={isPublic}
                  showcaseSwipeOptIn={showcaseSwipeOptIn}
                  profilSettingsHref={profilSettingsHref}
                  weeklyRank={ownWeeklyRank}
                  variant="compact"
                  rankShownInHeader={weeklyRankShownInHeader}
                />
              ) : null}
              {ownTopThreeShareCardData ? (
                <ShowcaseTopThreeStoryShare
                  cardData={ownTopThreeShareCardData}
                  className="border-t border-[color:var(--vd-border)] pt-4"
                />
              ) : null}
            </div>
          </ShowcaseDiscoverSection>
        ) : null}

        <WeeklyTopBuilds
          builds={weeklyBuilds}
          entdeckenReturnHref={entdeckenReturnHref}
          className="mb-0 border-0 pb-0"
        />

        <ShowcaseInviteFriends />
      </motion.div>
    </div>
  );
}
