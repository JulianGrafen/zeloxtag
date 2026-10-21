import { buildShareableBuildData } from "@/components/shareable-spec-card/build-shareable-build-data";
import { buildBuildDnaProfileContext } from "@/lib/showcase/build-dna-profile-context";
import type { TopThreeWeeklyRank } from "@/lib/showcase/vehicle-weekly-showcase-rank-helpers";
import type { VehicleWeeklyShowcaseRank } from "@/lib/showcase/vehicle-weekly-showcase-rank-map";
import {
  buildDemoPublicShowcasePayload,
  enrichDemoShowcaseVehicle,
} from "@/lib/demo/demo-public-showcase-payload";
import { DEMO_SHOWCASE_VEHICLE_IMAGE } from "@/lib/tags/demo-showcase";
import { getMockTagScan, MOCK_TAG_UUIDS } from "@/lib/tags/mock-tags";

import type { ShareableBuildData } from "@/components/shareable-spec-card/types";

export function buildDemoShareCardData(
  rank: TopThreeWeeklyRank = 1,
): ShareableBuildData | null {
  const scan = getMockTagScan(MOCK_TAG_UUIDS.active);
  if (!scan?.vehicle) return null;

  const weeklyRank: VehicleWeeklyShowcaseRank = {
    rank,
    weeklyLikes: rank === 1 ? 128 : rank === 2 ? 96 : 72,
  };

  const vehicle = enrichDemoShowcaseVehicle(scan.vehicle);
  const payload = buildDemoPublicShowcasePayload(vehicle, scan.documents);
  const data = buildShareableBuildData({
    profile: {
      ...payload.profile,
      heroImageSrc: payload.profile.heroImageSrc ?? DEMO_SHOWCASE_VEHICLE_IMAGE,
    },
    modificationsCount: payload.modifications.length,
    buildDna: payload.buildDna,
    modifications: payload.modifications,
    buildDnaProfile: buildBuildDnaProfileContext(vehicle),
    weeklyShowcaseRank: rank,
  });

  if (!data) return null;

  return {
    ...data,
    imageUrl: data.imageUrl ?? DEMO_SHOWCASE_VEHICLE_IMAGE,
    weeklyShowcaseRank: rank,
    instagramHandle: data.instagramHandle ?? "julian.grafen",
  };
}
