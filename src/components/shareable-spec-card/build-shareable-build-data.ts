import type { ShowcaseBuildDna } from "@/lib/showcase/build-dna-schema";
import type { PublicShowcaseProfile } from "@/lib/vehicles/public-showcase-data";
import { formatPublicVehicleTitle } from "@/lib/vehicles/format-public-vehicle-title";

import { buildShareCardSpecRows } from "./build-share-card-spec-rows";
import type { ShareableBuildData } from "./types";

export type BuildShareableBuildDataInput = {
  profile: PublicShowcaseProfile;
  modificationsCount: number;
  buildDna?: ShowcaseBuildDna | null;
};

export function buildShareableBuildData(
  input: BuildShareableBuildDataInput,
): ShareableBuildData | null {
  const specRows = buildShareCardSpecRows(input.profile);
  const buildDna = input.buildDna ?? null;

  if (specRows.length === 0 && buildDna == null) {
    return null;
  }

  const title = formatPublicVehicleTitle(input.profile.make, input.profile.model);
  const modelName =
    input.profile.year != null && title
      ? `${title} · ${input.profile.year}`
      : title || "Fahrzeug";

  return {
    modelName,
    instagramHandle: input.profile.instagramHandle,
    imageUrl: input.profile.heroImageSrc ?? undefined,
    specRows,
    modificationsCount: Math.max(0, input.modificationsCount),
    buildDna,
  };
}
