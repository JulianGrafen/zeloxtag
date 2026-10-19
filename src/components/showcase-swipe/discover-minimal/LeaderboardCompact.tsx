"use client";

import Image from "next/image";
import Link from "next/link";

import { weeklyRankCardHeroImageClassName } from "@/lib/image/showcase-vehicle-focus-image";
import { buildDiscoverShowcaseHref } from "@/lib/showcase/discover-showcase-navigation";
import type { WeeklyTopBuild } from "@/lib/showcase/weekly-top-builds-map";
import { cn } from "@/lib/utils";

function rankAccentClass(rank: number): string {
  if (rank === 1) return "text-amber-400";
  if (rank === 2) return "text-zinc-300";
  if (rank === 3) return "text-orange-400";
  return "text-zinc-500";
}

type LeaderboardCompactProps = {
  builds: WeeklyTopBuild[];
  entdeckenReturnHref: string;
  title?: string;
  className?: string;
};

export function LeaderboardCompact({
  builds,
  entdeckenReturnHref,
  title = "Top Builds",
  className,
}: LeaderboardCompactProps) {
  return (
    <section
      className={cn(
        "flex flex-col gap-3 border-t border-white/5 pt-5",
        className,
      )}
      id="weekly-top-builds"
    >
      <h2 className="text-[0.92rem] font-semibold text-white">{title}</h2>
      {builds.length === 0 ? (
        <p className="py-4 text-[0.85rem] text-zinc-500">
          Noch keine Platzierungen diese Woche.
        </p>
      ) : (
        <ul className="flex flex-col">
          {builds.map((build) => {
            const label = [build.make, build.model].filter(Boolean).join(" ");
            const heroSrc = build.heroImageSrc?.trim() || null;
            const href = buildDiscoverShowcaseHref(
              build.publicSlug,
              entdeckenReturnHref,
            );

            return (
              <li key={build.publicSlug}>
                <Link
                  href={href}
                  className="flex items-center gap-3 border-b border-white/5 py-3 transition active:bg-white/[0.03]"
                >
                  <span
                    className={cn(
                      "w-8 shrink-0 font-mono text-[0.82rem] font-semibold tabular-nums",
                      rankAccentClass(build.rank),
                    )}
                  >
                    #{build.rank}
                  </span>
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-zinc-900 ring-1 ring-white/10">
                    {heroSrc ? (
                      <Image
                        src={heroSrc}
                        alt=""
                        fill
                        className={weeklyRankCardHeroImageClassName(
                          heroSrc,
                          build.heroImageUsesCover,
                        )}
                        sizes="48px"
                        unoptimized={heroSrc.startsWith("/api/")}
                      />
                    ) : (
                      <span className="flex h-full items-center justify-center text-[0.65rem] text-zinc-600">
                        —
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[0.88rem] font-medium text-white">
                      {label}
                    </p>
                    {build.year != null ? (
                      <p className="text-[0.75rem] text-zinc-500">{build.year}</p>
                    ) : null}
                  </div>
                  <span className="shrink-0 text-[0.82rem] font-medium tabular-nums text-zinc-300">
                    🔥 {build.weeklyLikes}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
