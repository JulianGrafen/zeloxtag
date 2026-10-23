import "server-only";

import {
  bytesToOgImageDataUri,
  fetchOgImageDataUri,
} from "@/lib/og/fetch-og-image-bytes";
import { optimizeWebImageBytes } from "@/lib/image/optimize-web-image";
import { parseStoryCardHeroAbsoluteUrl } from "@/lib/og/story-card/parse-story-card-hero-url";
import { loadShowcaseStorageImageBytes } from "@/lib/vehicles/load-showcase-storage-image";
import { SILHOUETTE_SHOWCASE_HERO_MAX_EDGE } from "@/lib/vehicles/silhouette-constants";
import { loadVehicleSilhouetteBytes } from "@/lib/vehicles/load-silhouette-bytes";
import { isLikelyImageBytes } from "@/lib/vehicles/silhouette-bytes";

async function bytesToOptimizedHeroDataUri(
  bytes: Uint8Array,
): Promise<string | null> {
  if (!isLikelyImageBytes(bytes)) {
    return null;
  }
  try {
    const { body } = await optimizeWebImageBytes(bytes, {
      maxEdgePx: SILHOUETTE_SHOWCASE_HERO_MAX_EDGE,
    });
    const optimized = bytesToOgImageDataUri(body);
    if (optimized.ok) {
      return optimized.dataUri;
    }
  } catch {
    const raw = bytesToOgImageDataUri(bytes);
    if (raw.ok) {
      return raw.dataUri;
    }
  }
  return null;
}

export async function resolveStoryCardHeroDataUri(input: {
  vehicleId: string;
  heroAbsoluteUrl: string | null;
}): Promise<string | null> {
  const stored = await loadVehicleSilhouetteBytes(input.vehicleId);
  if (stored) {
    const fromSilhouette = await bytesToOptimizedHeroDataUri(stored);
    if (fromSilhouette) {
      return fromSilhouette;
    }
  }

  const parsed = parseStoryCardHeroAbsoluteUrl(input.heroAbsoluteUrl);
  if (parsed?.kind === "publicFile") {
    const galleryBytes = await loadShowcaseStorageImageBytes(
      parsed.vehicleId,
      parsed.src,
    );
    if (galleryBytes) {
      const fromGallery = await bytesToOptimizedHeroDataUri(galleryBytes);
      if (fromGallery) {
        return fromGallery;
      }
    }
  }

  if (parsed?.kind === "silhouette") {
    return null;
  }

  const remoteUrl =
    parsed?.kind === "remote" ? parsed.url : input.heroAbsoluteUrl;
  const remote = await fetchOgImageDataUri(remoteUrl);
  return remote.ok ? remote.dataUri : null;
}
