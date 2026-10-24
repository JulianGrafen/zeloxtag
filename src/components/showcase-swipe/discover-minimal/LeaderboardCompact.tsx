"use client";

import Link from "next/link";

import { SwipeLeaderboardThumb } from "@/components/showcase-swipe/discover-minimal/SwipeLeaderboardThumb";
import { buildDiscoverShowcaseHref } from "@/lib/showcase/discover-showcase-navigation";
import {
  discoverOwnPlacementBadgeGlowClass,
  discoverOwnPlacementShellClass,
  discoverRankAccentGradient,
  discoverRankBadgeClass,
  discoverRankListAccentClass,
} from "@/lib/showcase/discover-weekly-rank-visual";
import type { WeeklyTopBuild } from "@/lib/showcase/weekly-top-builds-map";
import { cn } from "@/lib/utils";

type LeaderboardCompactProps = {
  builds: WeeklyTopBuild[];
  entdeckenReturnHref: string;
  title?: string;
  className?: string;
  /** Highlights the signed-in owner's row in the list. */
  ownVehicleId?: string | null;
};

export function LeaderboardCompact({
  builds,
  entdeckenReturnHref,
  title = "Top Builds",
  className,
  ownVehicleId = null,
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
            const href = buildDiscoverShowcaseHref(
              build.publicSlug,
              entdeckenReturnHref,
            );
            const isOwn =
              ownVehicleId != null && build.vehicleId === ownVehicleId;

            return (
              <li key={build.publicSlug}>
                <Link
                  href={href}
                  className={cn(
                    "flex items-center gap-3 border-b border-white/5 py-3 transition active:bg-white/[0.03]",
                    isOwn &&
                      cn(
                        "relative my-1.5 rounded-2xl border-0 border-b-0 bg-gradient-to-b px-3 py-3.5 pt-4 -mx-1",
                        discoverRankAccentGradient(build.rank),
                        discoverOwnPlacementShellClass(build.rank),
                      ),
                  )}
                  aria-current={isOwn ? "true" : undefined}
                >
                  {isOwn ? (
                    <span
                      className="absolute -top-2 left-3 rounded-full bg-amber-400 px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide text-black shadow-sm"
                      aria-hidden
                    >
                      Dein Build
                    </span>
                  ) : null}
                  <span
                    className={cn(
                      isOwn
                        ? cn(
                            discoverRankBadgeClass(build.rank),
                            "h-10 min-w-10 text-[0.95rem]",
                            discoverOwnPlacementBadgeGlowClass(build.rank),
                          )
                        : cn(
                            "w-8 shrink-0 font-mono text-[0.82rem] font-semibold tabular-nums",
                            discoverRankListAccentClass(build.rank),
                          ),
                    )}
                  >
                    #{build.rank}
                  </span>
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-zinc-900 ring-1 ring-white/10">
                    <SwipeLeaderboardThumb
                      heroImageSrc={build.heroImageSrc}
                      make={build.make}
                      model={build.model}
                      heroImageUsesCover={build.heroImageUsesCover}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[0.88rem] font-medium text-white">
                      {label}
                      {isOwn ? (
                        <span className="ml-1.5 rounded-full bg-white/15 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-white ring-1 ring-white/25">
                          Du
                        </span>
                      ) : null}
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
