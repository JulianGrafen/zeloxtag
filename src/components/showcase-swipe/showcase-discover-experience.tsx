"use client";

import { useCallback, useState } from "react";

import { ShowcaseSwipeDeck } from "@/components/showcase-swipe/ShowcaseSwipeDeck";
import { WeeklyTopBuilds } from "@/components/showcase-swipe/weekly-top-builds";
import type { ShowcaseSwipeCard } from "@/lib/showcase/swipe-types";
import type { WeeklyTopBuild } from "@/lib/showcase/weekly-top-builds-map";

type ShowcaseDiscoverExperienceProps = {
  tagUuid: string;
  initialCards?: ShowcaseSwipeCard[];
  initialWeeklyBuilds: WeeklyTopBuild[];
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
      <ShowcaseSwipeDeck
        tagUuid={tagUuid}
        initialCards={initialCards}
        onLiked={onLiked}
      />
      <WeeklyTopBuilds builds={weeklyBuilds} />
    </div>
  );
}
