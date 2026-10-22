"use client";

import { useMemo, useState } from "react";

import {
  ShareableSpecCard,
  buildShareableBuildData,
} from "@/components/shareable-spec-card";
import { buildDemoShareCardData } from "@/lib/demo/demo-share-card-data";
import { buildBuildDnaProfileContextFromPublicProfile } from "@/lib/showcase/build-dna-profile-context";
import { MOCK_DEMO_VEHICLE_ID } from "@/lib/tags/mock-tags";
import type { PublicShowcasePayload } from "@/lib/vehicles/public-showcase-data";

import { ShowroomDisclosure } from "./ShowroomDisclosure";
import { showroom } from "./showroom-styles";

type ShowroomStoryShareProps = {
  data: PublicShowcasePayload;
};

function storyShareCollapsedSubtitle(
  open: boolean,
  vehicleLabel: string,
): string | undefined {
  if (open) return undefined;
  const short = vehicleLabel.trim();
  return short ? `${short} · Story & Post` : "Instagram Story & Post";
}

export function ShowroomStoryShare({ data }: ShowroomStoryShareProps) {
  const [open, setOpen] = useState(false);

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

  const vehicleLabel = `${data.profile.make} ${data.profile.model}${
    data.profile.year ? ` · ${data.profile.year}` : ""
  }`.trim();

  return (
    <section
      className="relative z-10 px-4"
      aria-labelledby="showroom-story-share-title"
    >
      <div className={showroom.panelFlat}>
        <ShowroomDisclosure
          title="Story teilen"
          subtitle={storyShareCollapsedSubtitle(open, vehicleLabel)}
          open={open}
          onToggle={() => setOpen((value) => !value)}
          panelId="showroom-story-share-panel"
          collapsible
        >
          <div className="px-4 pb-4 pt-1">
            <p
              id="showroom-story-share-title"
              className="sr-only"
            >
              Story teilen
            </p>
            <p className="text-[0.82rem] leading-snug text-white/55">
              9:16 für Instagram Stories — auf dem Handy direkt über das
              Teilen-Menü.
            </p>
            <ShareableSpecCard
              data={cardData}
              previewMaxWidth={260}
              className="mt-4 w-full"
            />
          </div>
        </ShowroomDisclosure>
      </div>
    </section>
  );
}
