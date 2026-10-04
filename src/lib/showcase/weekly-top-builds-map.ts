import { showcaseSilhouetteSwipeUrl } from "@/lib/vehicles/showcase-media-url";

export type WeeklyTopBuild = {
  rank: number;
  vehicleId: string;
  publicSlug: string;
  make: string;
  model: string;
  year: number | null;
  weeklyLikes: number;
  heroImageSrc: string | null;
};

export type WeeklyTopBuildRow = {
  rank: number;
  vehicle_id: string;
  public_slug: string;
  make: string;
  model: string;
  year: number | null;
  weekly_likes: number;
  has_silhouette: boolean;
  silhouette_image_url?: string | null;
  updated_at?: string | null;
};

export function mapWeeklyTopBuildRow(
  row: WeeklyTopBuildRow,
): WeeklyTopBuild | null {
  const publicSlug = row.public_slug?.trim();
  const vehicleId = row.vehicle_id?.trim();
  if (!publicSlug || !vehicleId) return null;

  const rank = Math.max(1, Math.floor(row.rank ?? 1));
  const weeklyLikes = Math.max(0, Math.floor(row.weekly_likes ?? 0));
  if (weeklyLikes <= 0) return null;

  return {
    rank,
    vehicleId,
    publicSlug,
    make: row.make ?? "",
    model: row.model ?? "",
    year: row.year ?? null,
    weeklyLikes,
    heroImageSrc:
      row.has_silhouette && vehicleId
        ? showcaseSilhouetteSwipeUrl(vehicleId, {
            silhouetteImageUrl: row.silhouette_image_url,
            updatedAt: row.updated_at,
          })
        : null,
  };
}
