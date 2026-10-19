import { buildOwnerShareableBuildData } from "@/lib/showcase/build-owner-shareable-build-data";
import type { TopThreeWeeklyRank } from "@/lib/showcase/vehicle-weekly-showcase-rank-helpers";
import type { VehicleWeeklyShowcaseRank } from "@/lib/showcase/vehicle-weekly-showcase-rank-map";
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

  const data = buildOwnerShareableBuildData(
    scan.vehicle,
    scan.documents,
    weeklyRank,
  );

  if (!data) return null;

  return {
    ...data,
    imageUrl: data.imageUrl ?? DEMO_SHOWCASE_VEHICLE_IMAGE,
    weeklyShowcaseRank: rank,
    instagramHandle: data.instagramHandle ?? "julian.grafen",
  };
}
