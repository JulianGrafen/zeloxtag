import type { BuildDnaProfileContext } from "@/lib/showcase/build-dna-profile-context";
import { isBuildDnaEligible } from "@/lib/showcase/build-dna-eligibility";
import { computeBuildDnaHeuristic } from "@/lib/showcase/build-dna-heuristic";
import type { ShowcaseBuildDna } from "@/lib/showcase/build-dna-schema";
import type {
  PublicModification,
  PublicShowcaseProfile,
} from "@/lib/vehicles/public-showcase-data";
import { formatPublicVehicleTitle } from "@/lib/vehicles/format-public-vehicle-title";
import { parseInstagramHandle } from "@/lib/vehicles/instagram-handle";

import type { TopThreeWeeklyRank } from "@/lib/showcase/vehicle-weekly-showcase-rank-helpers";

import { buildShareCardSpecRows } from "./build-share-card-spec-rows";
import type { ShareableBuildData } from "./types";

export type BuildShareableBuildDataInput = {
  profile: PublicShowcaseProfile;
  modificationsCount: number;
  buildDna?: ShowcaseBuildDna | null;
  /** When set, heuristic DNA is used if cache is missing but ≥2 public mods exist. */
  modifications?: readonly PublicModification[];
  buildDnaProfile?: BuildDnaProfileContext;
  weeklyShowcaseRank?: TopThreeWeeklyRank;
};

/** Same visibility rules as public showcase DNA block. */
export function resolveShareCardBuildDna(
  modificationsCount: number,
  buildDna: ShowcaseBuildDna | null | undefined,
  modifications?: readonly PublicModification[],
  profile?: BuildDnaProfileContext,
): ShowcaseBuildDna | null {
  const mods = modifications ?? [];
  const eligible =
    profile != null
      ? isBuildDnaEligible(modificationsCount, profile)
      : modificationsCount >= 2;

  if (!eligible) {
    return null;
  }

  if (buildDna != null) {
    return buildDna;
  }

  return computeBuildDnaHeuristic(mods, profile);
}

export function buildShareableBuildData(
  input: BuildShareableBuildDataInput,
): ShareableBuildData | null {
  const specRows = buildShareCardSpecRows(input.profile);
  const buildDna = resolveShareCardBuildDna(
    input.modificationsCount,
    input.buildDna,
    input.modifications,
    input.buildDnaProfile,
  );

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
    instagramHandle: parseInstagramHandle(input.profile.instagramHandle),
    imageUrl: input.profile.heroImageSrc ?? undefined,
    specRows,
    modificationsCount: Math.max(0, input.modificationsCount),
    buildDna,
    ...(input.weeklyShowcaseRank != null
      ? { weeklyShowcaseRank: input.weeklyShowcaseRank }
      : {}),
  };
}
