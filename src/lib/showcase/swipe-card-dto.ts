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
  has_silhouette: boolean;
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
      ? `/api/vehicle/silhouette/${vehicleId}`
      : null;

  return {
    publicSlug,
    make: row.make,
    model: row.model,
    year: row.year ?? null,
    heroImageSrc,
    powerPs: toNullableNumber(row.power_ps),
    torqueNm: toNullableNumber(row.torque_nm),
    accel0To100Sec: toNullableNumber(row.accel_0_100_sec),
    accel100To200Sec: toNullableNumber(row.accel_100_200_sec),
    modificationCount: Math.max(0, Math.floor(row.modification_count ?? 0)),
  };
}
