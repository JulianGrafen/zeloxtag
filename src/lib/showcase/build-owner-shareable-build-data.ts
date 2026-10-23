import {
  buildShareableBuildData,
  type BuildShareableBuildDataInput,
} from "@/components/shareable-spec-card/build-shareable-build-data";
import { buildBuildDnaProfileContext } from "@/lib/showcase/build-dna-profile-context";
import {
  topThreeWeeklyRankOrNull,
  type TopThreeWeeklyRank,
} from "@/lib/showcase/vehicle-weekly-showcase-rank-helpers";
import type { VehicleWeeklyShowcaseRank } from "@/lib/showcase/vehicle-weekly-showcase-rank-map";
import { buildPublicShowcasePayload } from "@/lib/vehicles/public-showcase-data";
import { resolveVehicleCatalogImage } from "@/lib/vehicles/vehicle-image";
import type { Document, Vehicle } from "@/types/database";

import type { ShareableBuildData } from "@/components/shareable-spec-card/types";

export function weeklyShowcaseRankForShareCard(
  weeklyRank: VehicleWeeklyShowcaseRank | null | undefined,
): TopThreeWeeklyRank | undefined {
  if (!weeklyRank) return undefined;
  const top = topThreeWeeklyRankOrNull(weeklyRank.rank);
  return top ?? undefined;
}

export function buildOwnerShareableBuildData(
  vehicle: Vehicle,
  documents: Document[],
  weeklyRank?: VehicleWeeklyShowcaseRank | null,
): ShareableBuildData | null {
  const payload = buildPublicShowcasePayload(vehicle, documents);
  const weeklyShowcaseRank = weeklyShowcaseRankForShareCard(weeklyRank);
  const catalogHero = resolveVehicleCatalogImage(vehicle.make, vehicle.model);
  const heroImageSrc =
    payload.profile.heroImageSrc ?? catalogHero?.src ?? null;

  const input: BuildShareableBuildDataInput = {
    profile: { ...payload.profile, heroImageSrc },
    modificationsCount: payload.modifications.length,
    buildDna: payload.buildDna,
    modifications: payload.modifications,
    buildDnaProfile: buildBuildDnaProfileContext(vehicle),
    ...(weeklyShowcaseRank != null ? { weeklyShowcaseRank } : {}),
  };

  return buildShareableBuildData(input);
}
