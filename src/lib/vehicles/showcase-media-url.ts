import {
  cacheBustFromSilhouetteUrl,
  silhouetteDisplayUrl,
} from "@/lib/vehicles/silhouette-display-url";
import {
  SILHOUETTE_SHOWCASE_GALLERY_MAX_EDGE,
  SILHOUETTE_SHOWCASE_HERO_MAX_EDGE,
  SILHOUETTE_SHOWCASE_SWIPE_MAX_EDGE,
} from "@/lib/vehicles/silhouette-constants";

export function resolveShowcaseSilhouetteCacheBust(input: {
  silhouetteImageUrl?: string | null;
  updatedAt?: string | number | null;
}): string {
  const fromUrl = input.silhouetteImageUrl
    ? cacheBustFromSilhouetteUrl(input.silhouetteImageUrl)
    : null;
  if (fromUrl) return fromUrl;
  if (input.updatedAt != null && String(input.updatedAt).trim() !== "") {
    return String(input.updatedAt);
  }
  return "1";
}

export function showcaseSilhouetteHeroUrl(
  vehicleId: string,
  input?: {
    silhouetteImageUrl?: string | null;
    updatedAt?: string | number | null;
  },
): string {
  const bust = resolveShowcaseSilhouetteCacheBust(input ?? {});
  return silhouetteDisplayUrl(vehicleId, bust, {
    maxEdge: SILHOUETTE_SHOWCASE_HERO_MAX_EDGE,
  });
}

export function showcaseSilhouetteSwipeUrl(
  vehicleId: string,
  input?: {
    silhouetteImageUrl?: string | null;
    updatedAt?: string | number | null;
  },
): string {
  const bust = resolveShowcaseSilhouetteCacheBust(input ?? {});
  return silhouetteDisplayUrl(vehicleId, bust, {
    maxEdge: SILHOUETTE_SHOWCASE_SWIPE_MAX_EDGE,
  });
}

export function showcaseGalleryFileUrl(
  vehicleId: string,
  fileUrl: string,
  maxEdge = SILHOUETTE_SHOWCASE_GALLERY_MAX_EDGE,
): string {
  const params = new URLSearchParams({
    src: fileUrl,
    w: String(Math.round(maxEdge)),
  });
  return `/api/public/vehicle/${vehicleId}/file?${params.toString()}`;
}
