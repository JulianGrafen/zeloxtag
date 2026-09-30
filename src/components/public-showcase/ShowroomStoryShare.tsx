"use client";

import { useMemo } from "react";

import {
  ShareableSpecCard,
  buildShareableBuildData,
} from "@/components/shareable-spec-card";
import type { PublicShowcasePayload } from "@/lib/vehicles/public-showcase-data";

import { showroom } from "./showroom-styles";

type ShowroomStoryShareProps = {
  data: PublicShowcasePayload;
};

export function ShowroomStoryShare({ data }: ShowroomStoryShareProps) {
  const cardData = useMemo(
    () =>
      buildShareableBuildData({
        profile: data.profile,
        modificationsCount: data.modifications.length,
        buildDna: data.buildDna,
      }),
    [data],
  );

  if (!cardData) {
    return null;
  }

  return (
    <section className="relative z-10 px-4" aria-labelledby="showroom-story-share-title">
      <div className={showroom.panelFlat}>
        <div className="px-4 py-4">
          <p id="showroom-story-share-title" className={showroom.sectionLabel}>
            Story teilen
          </p>
          <p className="text-[0.82rem] leading-snug text-white/55">
            Digitaler Fahrzeugpass als 9:16-Bild — native Freigabe oder Download.
          </p>
          <ShareableSpecCard
            data={cardData}
            previewMaxWidth={260}
            className="mt-4 w-full"
            exportButtonLabel="Karte teilen"
          />
        </div>
      </div>
    </section>
  );
}
