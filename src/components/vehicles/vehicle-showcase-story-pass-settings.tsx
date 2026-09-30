"use client";

import { useMemo } from "react";

import {
  ShareableSpecCard,
  buildShareableBuildData,
} from "@/components/shareable-spec-card";
import { buildBuildDnaProfileContext } from "@/lib/showcase/build-dna-profile-context";
import { buildPublicShowcasePayload } from "@/lib/vehicles/public-showcase-data";
import type { Document, Vehicle } from "@/types/database";

type VehicleShowcaseStoryPassSettingsProps = {
  vehicle: Vehicle;
  documents: Document[];
};

export function VehicleShowcaseStoryPassSettings({
  vehicle,
  documents,
}: VehicleShowcaseStoryPassSettingsProps) {
  const cardData = useMemo(() => {
    const payload = buildPublicShowcasePayload(vehicle, documents);
    return buildShareableBuildData({
      profile: payload.profile,
      modificationsCount: payload.modifications.length,
      buildDna: payload.buildDna,
      modifications: payload.modifications,
      buildDnaProfile: buildBuildDnaProfileContext(vehicle),
    });
  }, [vehicle, documents]);

  return (
    <div className="px-4 py-5">
      <div className="space-y-1">
        <h2 className="text-[0.98rem] font-semibold text-[color:var(--vd-text)]">
          Story-Pass
        </h2>
        <p className="text-[0.82rem] leading-snug text-[color:var(--vd-muted)]">
          9:16-Karte für Instagram Stories
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
