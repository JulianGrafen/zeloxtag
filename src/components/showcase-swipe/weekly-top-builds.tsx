"use client";

import { ShowcaseDiscoverSection } from "@/components/showcase-swipe/showcase-discover-section";
import { VehicleRankCard } from "@/components/showcase-swipe/vehicle-rank-card";
import { SHOWCASE_WEEKLY_LIKE_WINDOW_LABEL } from "@/lib/showcase/showcase-weekly-like-window";
import type { WeeklyTopBuild } from "@/lib/showcase/weekly-top-builds-map";
type WeeklyTopBuildsProps = {
  builds: WeeklyTopBuild[];
  entdeckenReturnHref: string;
  className?: string;
};

export function WeeklyTopBuilds({
  builds,
  entdeckenReturnHref,
  className,
}: WeeklyTopBuildsProps) {
  return (
    <ShowcaseDiscoverSection
      title="Top Builds"
      subtitle={`Meiste Likes in ${SHOWCASE_WEEKLY_LIKE_WINDOW_LABEL}`}
      className={className}
      id="weekly-top-builds"
    >
      {builds.length === 0 ? (
        <div
          className="rounded-2xl border border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)]/50 px-5 py-8 text-center"
        >
          <p className="text-[0.9rem] font-medium text-[color:var(--vd-text)]">
            Noch keine Platzierungen diese Woche.
          </p>
          <p className="mt-2 text-[0.82rem] text-[color:var(--vd-muted)]">
            Sei der Erste — swipe Builds nach rechts und gib Likes.
          </p>
        </div>
      ) : (
        <ul
          className="-mx-1 flex gap-3 overflow-x-auto overscroll-x-contain px-1 pb-2 snap-x snap-mandatory [-webkit-overflow-scrolling:touch]"
          aria-label="Top der Woche"
        >
          {builds.map((build) => (
            <li key={build.publicSlug}>
              <VehicleRankCard
                build={build}
                entdeckenReturnHref={entdeckenReturnHref}
              />
            </li>
          ))}
        </ul>
      )}
    </ShowcaseDiscoverSection>
  );
}
