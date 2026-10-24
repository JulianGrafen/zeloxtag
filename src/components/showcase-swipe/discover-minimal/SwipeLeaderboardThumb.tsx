"use client";

import { weeklyRankCardHeroImageClassName } from "@/lib/image/showcase-vehicle-focus-image";

import { SwipeHeroImage } from "./SwipeHeroImage";

type SwipeLeaderboardThumbProps = {
  heroImageSrc: string | null;
  make: string;
  model: string;
  heroImageUsesCover: boolean;
};

export function SwipeLeaderboardThumb({
  heroImageSrc,
  make,
  model,
  heroImageUsesCover,
}: SwipeLeaderboardThumbProps) {
  const rawHero = heroImageSrc?.trim() ?? "";

  if (!rawHero) {
    return (
      <span className="flex h-full items-center justify-center text-[0.65rem] text-zinc-600">
        —
      </span>
    );
  }

  return (
    <SwipeHeroImage
      initialSrc={heroImageSrc}
      make={make}
      model={model}
      alt=""
      className={weeklyRankCardHeroImageClassName(rawHero, heroImageUsesCover)}
    />
  );
}
