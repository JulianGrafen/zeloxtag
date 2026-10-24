"use client";

import Link from "next/link";

import { weeklyRankCardHeroImageClassName } from "@/lib/image/showcase-vehicle-focus-image";
import { buildDiscoverShowcaseHref } from "@/lib/showcase/discover-showcase-navigation";
import type { WeeklyTopBuild } from "@/lib/showcase/weekly-top-builds-map";
import { cn } from "@/lib/utils";

import { SwipeHeroImage } from "./SwipeHeroImage";

type DiscoverBuildOfWeekHeroProps = {
  build: WeeklyTopBuild;
  entdeckenReturnHref: string;
  className?: string;
};

export function DiscoverBuildOfWeekHero({
  build,
  entdeckenReturnHref,
  className,
}: DiscoverBuildOfWeekHeroProps) {
  const label = [build.make, build.model].filter(Boolean).join(" ");
  const rawHero = build.heroImageSrc?.trim() ?? "";
  const href = buildDiscoverShowcaseHref(build.publicSlug, entdeckenReturnHref);

  return (
    <Link
      href={href}
      className={cn(
        "group flex flex-col overflow-hidden rounded-2xl border border-amber-400/25 bg-gradient-to-b from-amber-500/10 to-zinc-950 ring-1 ring-white/10 transition active:scale-[0.99]",
        className,
      )}
    >
      <div className="px-4 pt-3">
        <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-amber-300/90">
          Build der Woche
        </p>
        <p className="mt-0.5 truncate text-[1.02rem] font-semibold text-white">
          {label}
          {build.year != null ? (
            <span className="font-normal text-zinc-400"> · {build.year}</span>
          ) : null}
        </p>
        <p className="text-[0.78rem] text-zinc-400">
          {build.weeklyLikes} Like{build.weeklyLikes === 1 ? "" : "s"} · 7 Tage
        </p>
      </div>
      <div className="relative mt-3 aspect-[16/10] w-full bg-zinc-900">
        {rawHero ? (
          <SwipeHeroImage
            initialSrc={build.heroImageSrc}
            make={build.make}
            model={build.model}
            alt={label || "Build der Woche"}
            priority
            className={weeklyRankCardHeroImageClassName(
              rawHero,
              build.heroImageUsesCover,
            )}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-black" />
        )}
      </div>
    </Link>
  );
}
