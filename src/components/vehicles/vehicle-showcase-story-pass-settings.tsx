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
};

export function VehicleShowcaseStoryPassSettings({
  vehicle,
  documents,
  weeklyRank = null,
}: VehicleShowcaseStoryPassSettingsProps) {
  const topThree = topThreeWeeklyRankOrNull(weeklyRank?.rank ?? 0);
  const cardData = useMemo(
    () => buildOwnerShareableBuildData(vehicle, documents, weeklyRank),
    [vehicle, documents, weeklyRank],
  );

  return (
    <div className="px-4 py-5">
      <div className="space-y-1">
        <h2 className="text-[0.98rem] font-semibold text-[color:var(--vd-text)]">
          {topThree != null ? "Story-Pass · Top 3" : "Story-Pass"}
        </h2>
        <p className="text-[0.82rem] leading-snug text-[color:var(--vd-muted)]">
          {topThree != null
            ? "9:16-Karte mit deiner Wochenplatzierung für Instagram Stories"
            : "9:16-Karte für Instagram Stories"}
        </p>
      </div>

      {cardData ? (
        <ShareableSpecCard
          data={cardData}
          previewMaxWidth={280}
          className="mt-5 w-full"
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
