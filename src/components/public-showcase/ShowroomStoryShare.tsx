"use client";

import { useMemo } from "react";

import {
  ShareableSpecCard,
  buildShareableBuildData,
} from "@/components/shareable-spec-card";
import { buildDemoShareCardData } from "@/lib/demo/demo-share-card-data";
import { buildBuildDnaProfileContextFromPublicProfile } from "@/lib/showcase/build-dna-profile-context";
import { MOCK_DEMO_VEHICLE_ID } from "@/lib/tags/mock-tags";
import type { PublicShowcasePayload } from "@/lib/vehicles/public-showcase-data";

import { showroom } from "./showroom-styles";

type ShowroomStoryShareProps = {
  data: PublicShowcasePayload;
};

export function ShowroomStoryShare({ data }: ShowroomStoryShareProps) {
  const cardData = useMemo(() => {
    if (data.profile.vehicleId === MOCK_DEMO_VEHICLE_ID) {
      return buildDemoShareCardData(1);
    }
    return buildShareableBuildData({
      profile: data.profile,
      modificationsCount: data.modifications.length,
      buildDna: data.buildDna,
      modifications: data.modifications,
      buildDnaProfile: buildBuildDnaProfileContextFromPublicProfile(
        data.profile,
      ),
    });
  }, [data]);

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
            9:16 für Instagram Stories — auf dem Handy direkt über das Teilen-Menü.
          </p>
          <ShareableSpecCard
            data={cardData}
            previewMaxWidth={260}
            className="mt-4 w-full"
          />
        </div>
      </div>
    </section>
  );
}
