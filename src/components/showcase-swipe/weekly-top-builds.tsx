"use client";

import { VehicleRankCard } from "@/components/showcase-swipe/vehicle-rank-card";
import type { WeeklyTopBuild } from "@/lib/showcase/weekly-top-builds-map";
import { cn } from "@/lib/utils";

type WeeklyTopBuildsProps = {
  builds: WeeklyTopBuild[];
  className?: string;
};

export function WeeklyTopBuilds({ builds, className }: WeeklyTopBuildsProps) {
  return (
    <section
      className={cn("mt-2 border-t border-white/[0.06] pt-8", className)}
      aria-labelledby="weekly-top-builds-title"
    >
      <header className="mb-4 px-0.5">
        <h2
          id="weekly-top-builds-title"
          className="text-[1.02rem] font-semibold tracking-tight text-[color:var(--vd-text)]"
        >
          Builds of the Week
        </h2>
        <p className="mt-1 text-[0.78rem] text-[color:var(--vd-muted)]">
          Top-Likes der letzten 7 Tage
        </p>
      </header>

      {builds.length === 0 ? (
        <div
          className="rounded-2xl border border-white/[0.08] bg-gradient-to-b from-zinc-900/90 to-black px-5 py-8 text-center backdrop-blur-md"
        >
          <p className="text-[0.92rem] font-medium text-zinc-200">
            Noch keine Platzierungen diese Woche.
          </p>
          <p className="mt-2 text-[0.82rem] text-zinc-500">
            Sei der Erste — swipe Builds nach rechts und gib Likes.
          </p>
        </div>
      ) : (
        <ul
          className="-mx-1 flex gap-3 overflow-x-auto overscroll-x-contain px-1 pb-2 snap-x snap-mandatory [-webkit-overflow-scrolling:touch]"
        >
          {builds.map((build) => (
            <li key={build.publicSlug}>
              <VehicleRankCard build={build} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
