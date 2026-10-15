"use client";

import { useCallback, useRef, useState } from "react";
import { motion } from "motion/react";

import type { ShareableBuildData } from "@/components/shareable-spec-card/types";
import { ShowcaseDiscoverOptInBanner } from "@/components/showcase-swipe/showcase-discover-opt-in-banner";
import { ShowcaseDiscoverSection } from "@/components/showcase-swipe/showcase-discover-section";
import { ShowcaseInviteFriends } from "@/components/showcase-swipe/showcase-invite-friends";
import { ShowcaseSwipeDeck } from "@/components/showcase-swipe/ShowcaseSwipeDeck";
import { ShowcaseTopThreeStoryShare } from "@/components/showcase-swipe/showcase-top-three-story-share";
import { ShowcaseWeeklyPlacement } from "@/components/showcase-swipe/showcase-weekly-placement";
import { WeeklyTopBuilds } from "@/components/showcase-swipe/weekly-top-builds";
import type { ShowcaseSwipeCard } from "@/lib/showcase/swipe-types";
import type { VehicleWeeklyShowcaseRank } from "@/lib/showcase/vehicle-weekly-showcase-rank-map";
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
  ownTopThreeShareCardData: ShareableBuildData | null;
  /** When set, page header already shows Platz · Likes — placement stays slim. */
  weeklyRankShownInHeader?: boolean;
};

function sortWeeklyBuilds(rows: WeeklyTopBuild[]): WeeklyTopBuild[] {
  return [...rows]
    .sort((a, b) => {
      if (b.weeklyLikes !== a.weeklyLikes) {
        return b.weeklyLikes - a.weeklyLikes;
      }
      return a.rank - b.rank;
    })
    .map((item, index) => ({ ...item, rank: index + 1 }));
}

export function ShowcaseDiscoverExperience({
  tagUuid,
  entdeckenReturnHref,
  initialCards = [],
  initialWeeklyBuilds,
  isPublic,
  showcaseSwipeOptIn,
  profilSettingsHref,
  ownWeeklyRank,
  ownTopThreeShareCardData,
  weeklyRankShownInHeader = false,
}: ShowcaseDiscoverExperienceProps) {
  const [weeklyBuilds, setWeeklyBuilds] = useState(initialWeeklyBuilds);
  const [rankingsRevealed, setRankingsRevealed] = useState(false);
  const rankingsRef = useRef<HTMLDivElement>(null);
  const eligible = isPublic && showcaseSwipeOptIn;

  const onLiked = useCallback((card: ShowcaseSwipeCard) => {
    setWeeklyBuilds((prev) => {
      const existing = prev.find((b) => b.publicSlug === card.publicSlug);
      if (existing) {
        const next = prev.map((b) =>
          b.publicSlug === card.publicSlug
            ? { ...b, weeklyLikes: b.weeklyLikes + 1 }
            : b,
        );
        return sortWeeklyBuilds(next).slice(0, 10);
      }

      const newcomer: WeeklyTopBuild = {
        rank: prev.length + 1,
        vehicleId: "",
        publicSlug: card.publicSlug,
        make: card.make,
        model: card.model,
        year: card.year,
        weeklyLikes: 1,
        heroImageSrc: card.heroImageSrc,
      };
      return sortWeeklyBuilds([...prev, newcomer]).slice(0, 10);
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
      {!eligible ? (
        <ShowcaseDiscoverOptInBanner profilSettingsHref={profilSettingsHref} />
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
