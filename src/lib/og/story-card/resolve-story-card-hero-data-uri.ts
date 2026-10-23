import "server-only";

import {
  bytesToOgImageDataUri,
} from "@/lib/og/fetch-og-image-bytes";
import { optimizeWebImageBytes } from "@/lib/image/optimize-web-image";
import {
  loadShareCardHeroBytes,
  resolveShareCardHeroPath,
} from "@/lib/share/resolve-share-card-hero";
import { SILHOUETTE_SHOWCASE_HERO_MAX_EDGE } from "@/lib/vehicles/silhouette-constants";
import { isLikelyImageBytes } from "@/lib/vehicles/silhouette-bytes";
import type { Document, Vehicle } from "@/types/database";

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
  vehicle: Vehicle;
  documents: Document[];
  fetchOrigin?: string;
  cookieHeader?: string;
}): Promise<string | null> {
  const bytes = await loadShareCardHeroBytes(input.vehicle, input.documents, {
    fetchOrigin: input.fetchOrigin,
    cookieHeader: input.cookieHeader,
  });
  if (!bytes) {
    return null;
  }
  return bytesToOptimizedHeroDataUri(bytes);
}

export function shareCardExpectsHeroImage(
  vehicle: Vehicle,
  documents: Document[],
): boolean {
  return resolveShareCardHeroPath(vehicle, documents) != null;
}
