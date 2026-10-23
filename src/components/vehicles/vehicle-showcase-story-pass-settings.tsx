"use client";

import { useMemo } from "react";

import { ShareableSpecCard } from "@/components/shareable-spec-card";
import { buildOwnerShareableBuildData } from "@/lib/showcase/build-owner-shareable-build-data";
import type { VehicleWeeklyShowcaseRank } from "@/lib/showcase/vehicle-weekly-showcase-rank-map";
import { topThreeWeeklyRankOrNull } from "@/lib/showcase/vehicle-weekly-showcase-rank-helpers";
import type { Document, Vehicle } from "@/types/database";

type VehicleShowcaseStoryPassSettingsProps = {
  vehicle: Vehicle;
  documents: Document[];
  weeklyRank?: VehicleWeeklyShowcaseRank | null;
  embeddedInGroup?: boolean;
};

export function VehicleShowcaseStoryPassSettings({
  vehicle,
  documents,
  weeklyRank = null,
  embeddedInGroup = false,
}: VehicleShowcaseStoryPassSettingsProps) {
  const topThree = topThreeWeeklyRankOrNull(weeklyRank?.rank ?? 0);
  const cardData = useMemo(
    () => buildOwnerShareableBuildData(vehicle, documents, weeklyRank),
    [vehicle, documents, weeklyRank],
  );

  if (embeddedInGroup) {
    return (
      <div className="px-3 pb-4 pt-2">
        {topThree != null ? (
          <p className="mb-3 px-1 text-[13px] leading-snug text-zinc-400">
            Top 3 diese Woche — Rank-Hero oder voller Showcase.
          </p>
        ) : null}
        {cardData ? (
          <ShareableSpecCard
            data={cardData}
            vehicleId={vehicle.id}
            previewMaxWidth={280}
            className="w-full"
            defaultFormat="story"
            defaultStyle={topThree != null ? "rankHero" : undefined}
          />
        ) : (
          <p className="px-1 text-[13px] leading-snug text-zinc-400">
            Mindestens eine technische Angabe, Spezifikationstext oder
            Umbau-DNA (ab zwei Umbauten oder Beschreibung im Showcase) nötig.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="px-4 py-5">
      <div className="space-y-1">
        <h2 className="text-[0.98rem] font-semibold text-[color:var(--vd-text)]">
          {topThree != null ? "Story-Pass · Top 3" : "Story-Pass"}
        </h2>
        <p className="text-[0.82rem] leading-snug text-[color:var(--vd-muted)]">
          {topThree != null
            ? "Format und Stil wählen — Story oder Post, Platzierung oder voller Showcase."
            : "Story oder Post — voller Showcase oder Fokus auf dein Fahrzeug."}
        </p>
      </div>

      {cardData ? (
        <ShareableSpecCard
          data={cardData}
          vehicleId={vehicle.id}
          previewMaxWidth={280}
          className="mt-5 w-full"
          defaultFormat="story"
          defaultStyle={topThree != null ? "rankHero" : undefined}
        />
      ) : (
        <p className="mt-4 text-[0.82rem] text-[color:var(--vd-muted)]">
          Mindestens eine technische Angabe, Spezifikationstext oder Umbau-DNA
          (ab zwei Umbauten oder Beschreibung im Showcase) nötig.
        </p>
      )}
    </div>
  );
}
