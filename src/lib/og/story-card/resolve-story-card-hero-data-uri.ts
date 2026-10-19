import "server-only";

import {
  bytesToOgImageDataUri,
  fetchOgImageDataUri,
} from "@/lib/og/fetch-og-image-bytes";
import { optimizeWebImageBytes } from "@/lib/image/optimize-web-image";
import { SILHOUETTE_SHOWCASE_HERO_MAX_EDGE } from "@/lib/vehicles/silhouette-constants";
import { loadVehicleSilhouetteBytes } from "@/lib/vehicles/load-silhouette-bytes";
import { isLikelyImageBytes } from "@/lib/vehicles/silhouette-bytes";

export async function resolveStoryCardHeroDataUri(input: {
  vehicleId: string;
  heroAbsoluteUrl: string | null;
}): Promise<string | null> {
  const stored = await loadVehicleSilhouetteBytes(input.vehicleId);
  if (stored && isLikelyImageBytes(stored)) {
    try {
      const { body } = await optimizeWebImageBytes(stored, {
        maxEdgePx: SILHOUETTE_SHOWCASE_HERO_MAX_EDGE,
      });
      const optimized = bytesToOgImageDataUri(body);
      if (optimized.ok) {
        return optimized.dataUri;
      }
    } catch {
      const raw = bytesToOgImageDataUri(stored);
      if (raw.ok) {
        return raw.dataUri;
      }
    }
  }

  const remote = await fetchOgImageDataUri(input.heroAbsoluteUrl);
  return remote.ok ? remote.dataUri : null;
}
