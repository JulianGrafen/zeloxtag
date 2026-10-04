import { parseShowcaseBuildDna } from "@/lib/showcase/build-dna-schema";
import { showcaseSilhouetteSwipeUrl } from "@/lib/vehicles/showcase-media-url";
import {
  buildPersonalityLabels,
  parseBuildPersonalityTags,
} from "@/lib/vehicles/build-personality-chips";
import type { ShowcaseSwipeCard } from "@/lib/showcase/swipe-types";

export type ShowcaseSwipeCandidateRow = {
  vehicle_id: string;
  public_slug: string;
  make: string;
  model: string;
  year: number | null;
  power_ps: number | null;
  torque_nm: number | null;
  accel_0_100_sec: number | null;
  accel_100_200_sec: number | null;
  modification_count: number;
  total_likes?: number;
  has_silhouette: boolean;
  silhouette_image_url?: string | null;
  updated_at?: string | null;
  showcase_build_dna?: unknown;
  build_personality_tags?: unknown;
};

function toNullableNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

export function mapSwipeCandidateToCard(
  row: ShowcaseSwipeCandidateRow,
): ShowcaseSwipeCard | null {
  const publicSlug = row.public_slug?.trim();
  if (!publicSlug) return null;

  const vehicleId = row.vehicle_id?.trim();
  const heroImageSrc =
    row.has_silhouette && vehicleId
      ? showcaseSilhouetteSwipeUrl(vehicleId, {
          silhouetteImageUrl: row.silhouette_image_url,
          updatedAt: row.updated_at,
        })
      : null;

  const modificationCount = Math.max(
    0,
    Math.floor(row.modification_count ?? 0),
  );
  const buildDna =
    modificationCount >= 2
      ? parseShowcaseBuildDna(row.showcase_build_dna ?? null)
      : null;

  const totalLikes = Math.max(
    0,
    Math.floor(row.total_likes ?? 0),
  );

  return {
    publicSlug,
    make: row.make,
    model: row.model,
    year: row.year ?? null,
    totalLikes,
    heroImageSrc,
    powerPs: toNullableNumber(row.power_ps),
    torqueNm: toNullableNumber(row.torque_nm),
    accel0To100Sec: toNullableNumber(row.accel_0_100_sec),
    accel100To200Sec: toNullableNumber(row.accel_100_200_sec),
    modificationCount,
    buildDna,
    buildPersonalityLabels: buildPersonalityLabels(
      parseBuildPersonalityTags(row.build_personality_tags),
    ),
  };
}
