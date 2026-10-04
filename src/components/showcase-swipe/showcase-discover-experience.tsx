"use client";

import { useCallback, useState } from "react";

import { ShowcaseInviteFriends } from "@/components/showcase-swipe/showcase-invite-friends";
import { ShowcaseOwnSwipeLikes } from "@/components/showcase-swipe/showcase-own-swipe-likes";
import { ShowcaseSwipeDeck } from "@/components/showcase-swipe/ShowcaseSwipeDeck";
import { WeeklyTopBuilds } from "@/components/showcase-swipe/weekly-top-builds";
import type { ShowcaseSwipeCard } from "@/lib/showcase/swipe-types";
import type { WeeklyTopBuild } from "@/lib/showcase/weekly-top-builds-map";

type ShowcaseDiscoverExperienceProps = {
  tagUuid: string;
  initialCards?: ShowcaseSwipeCard[];
  initialWeeklyBuilds: WeeklyTopBuild[];
  ownSwipeTotalLikes: number;
  ownSwipeUnreadLikes?: number;
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
  ownSwipeTotalLikes,
  ownSwipeUnreadLikes = 0,
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
      <ShowcaseOwnSwipeLikes
        totalLikes={ownSwipeTotalLikes}
        unreadLikes={ownSwipeUnreadLikes}
      />
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
