import { resolvePublicAppOrigin } from "@/lib/api/resolve-api-base-url";
import { buildOwnerShareableBuildData } from "@/lib/showcase/build-owner-shareable-build-data";
import { topThreeWeeklyRankOrNull } from "@/lib/showcase/vehicle-weekly-showcase-rank-helpers";
import type { VehicleWeeklyShowcaseRank } from "@/lib/showcase/vehicle-weekly-showcase-rank-map";
import { buildVehicleCostOverview } from "@/lib/documents/cost-overview";
import { formatCurrencyEur, formatPower } from "@/lib/vehicles/expose-pdf/formatters";
import { formatPublicVehicleTitle } from "@/lib/vehicles/format-public-vehicle-title";
import {
  buildPublicShowcasePayload,
  type PublicModification,
} from "@/lib/vehicles/public-showcase-data";
import { parseVehicleTechSpecs } from "@/lib/vehicles/tech-specs";
import type { Document, Vehicle } from "@/types/database";

import { resolveAbsoluteAssetUrl } from "@/lib/og/resolve-absolute-url";

import type { StoryCardOgPayload } from "./story-card-og-types";

const TOP_MOD_LIMIT = 4;

export function formatStoryCardTrustBadge(
  publicSlug: string | null | undefined,
  origin: string = resolvePublicAppOrigin(),
): string {
  const host = origin.replace(/^https?:\/\//, "");
  const slug = publicSlug?.trim();
  if (slug) {
    return `Verified Build • ${host}/v/${slug}`;
  }
  return `Verified Build • ${host}`;
}

function topModLabelsFromCostAndMods(
  modificationLines: { label: string }[],
  modifications: readonly PublicModification[],
): string[] {
  const fromCost = modificationLines
    .map((line) => line.label.trim())
    .filter((label) => label.length > 0)
    .slice(0, TOP_MOD_LIMIT);

  if (fromCost.length >= TOP_MOD_LIMIT) {
    return fromCost;
  }

  const seen = new Set(fromCost.map((label) => label.toLowerCase()));
  const fallback: string[] = [...fromCost];

  for (const mod of modifications) {
    const label = mod.label.trim();
    if (!label) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    fallback.push(label);
    if (fallback.length >= TOP_MOD_LIMIT) break;
  }

  return fallback;
}

export type BuildStoryCardOgPayloadInput = {
  vehicle: Vehicle;
  documents: Document[];
  weeklyRank?: VehicleWeeklyShowcaseRank | null;
  siteOrigin?: string;
  heroImageDataUri?: string | null;
};

export function buildStoryCardOgPayload(
  input: BuildStoryCardOgPayloadInput,
): StoryCardOgPayload | null {
  const origin = input.siteOrigin ?? resolvePublicAppOrigin();
  const showcase = buildPublicShowcasePayload(input.vehicle, input.documents);
  const shareData = buildOwnerShareableBuildData(
    input.vehicle,
    input.documents,
    input.weeklyRank,
  );

  const specs = parseVehicleTechSpecs(input.vehicle.tech_specs);
  const title = formatPublicVehicleTitle(
    input.vehicle.make,
    input.vehicle.model,
  );
  const modelName =
    shareData?.modelName ??
    (input.vehicle.year != null && title
      ? `${title} · ${input.vehicle.year}`
      : title || "Fahrzeug");

  const powerLabel = formatPower(specs.powerPs, specs.powerKw);
  const hideFinancials = Boolean(input.vehicle.hide_financials);
  const costOverview = buildVehicleCostOverview(input.documents);
  const topMods = topModLabelsFromCostAndMods(
    costOverview.modificationLines,
    showcase.modifications,
  );

  const totalInvestedLabel =
    hideFinancials || costOverview.modification.total <= 0
      ? null
      : formatCurrencyEur(costOverview.modification.total) || null;

  const weeklyRank =
    topThreeWeeklyRankOrNull(input.weeklyRank?.rank ?? 0) ??
    shareData?.weeklyShowcaseRank ??
    null;

  const heroAbsolute = resolveAbsoluteAssetUrl(
    shareData?.imageUrl ?? showcase.profile.heroImageSrc,
    origin,
  );

  const hasRenderableContent =
    modelName.length > 0 &&
    (powerLabel !== "—" ||
      topMods.length > 0 ||
      totalInvestedLabel != null ||
      (shareData?.specRows.length ?? 0) > 0 ||
      shareData?.buildDna != null);

  if (!hasRenderableContent) {
    return null;
  }

  return {
    modelName,
    powerLabel,
    topMods,
    totalInvestedLabel,
    trustBadge: formatStoryCardTrustBadge(input.vehicle.public_slug, origin),
    heroImageDataUri: input.heroImageDataUri ?? null,
    weeklyRank,
    modificationsCount: showcase.modifications.length,
  };
}

/** Absolute hero URL for server-side image fetch (before data URI is known). */
export function resolveStoryCardHeroAbsoluteUrl(
  vehicle: Vehicle,
  documents: Document[],
  siteOrigin?: string,
): string | null {
  const origin = siteOrigin ?? resolvePublicAppOrigin();
  const shareData = buildOwnerShareableBuildData(vehicle, documents);
  const showcase = buildPublicShowcasePayload(vehicle, documents);
  return resolveAbsoluteAssetUrl(
    shareData?.imageUrl ?? showcase.profile.heroImageSrc,
    origin,
  );
}
