"use client";

import { useCallback, useState } from "react";

import type { ShareableBuildData } from "@/components/shareable-spec-card/types";
import { ShowcaseInviteFriends } from "@/components/showcase-swipe/showcase-invite-friends";
import { ShowcaseSwipeDeck } from "@/components/showcase-swipe/ShowcaseSwipeDeck";
import { ShowcaseTopThreeStoryShare } from "@/components/showcase-swipe/showcase-top-three-story-share";
import { ShowcaseWeeklyPlacement } from "@/components/showcase-swipe/showcase-weekly-placement";
import { WeeklyTopBuilds } from "@/components/showcase-swipe/weekly-top-builds";
import type { ShowcaseSwipeCard } from "@/lib/showcase/swipe-types";
import type { VehicleWeeklyShowcaseRank } from "@/lib/showcase/vehicle-weekly-showcase-rank-map";
import type { WeeklyTopBuild } from "@/lib/showcase/weekly-top-builds-map";

type ShowcaseDiscoverExperienceProps = {
  tagUuid: string;
  initialCards?: ShowcaseSwipeCard[];
  initialWeeklyBuilds: WeeklyTopBuild[];
  isPublic: boolean;
  showcaseSwipeOptIn: boolean;
  profilSettingsHref: string;
  ownWeeklyRank: VehicleWeeklyShowcaseRank | null;
  ownTopThreeShareCardData: ShareableBuildData | null;
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
  initialCards = [],
  initialWeeklyBuilds,
  isPublic,
  showcaseSwipeOptIn,
  profilSettingsHref,
  ownWeeklyRank,
  ownTopThreeShareCardData,
}: ShowcaseDiscoverExperienceProps) {
  const [weeklyBuilds, setWeeklyBuilds] = useState(initialWeeklyBuilds);

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

  return (
    <div className="flex flex-col gap-2">
      <ShowcaseWeeklyPlacement
        isPublic={isPublic}
        showcaseSwipeOptIn={showcaseSwipeOptIn}
        profilSettingsHref={profilSettingsHref}
        weeklyRank={ownWeeklyRank}
        variant="compact"
        className="mb-1"
      />
      {ownTopThreeShareCardData ? (
        <ShowcaseTopThreeStoryShare
          cardData={ownTopThreeShareCardData}
          className="mb-2 border-b border-white/[0.06] pb-6"
        />
      ) : null}
      <ShowcaseInviteFriends />
      <WeeklyTopBuilds builds={weeklyBuilds} />
      <ShowcaseSwipeDeck
        tagUuid={tagUuid}
        initialCards={initialCards}
        onLiked={onLiked}
      />
    </div>
  );
}
