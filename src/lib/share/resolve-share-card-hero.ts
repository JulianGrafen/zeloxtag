import "server-only";

import { resolveAbsoluteAssetUrl } from "@/lib/og/resolve-absolute-url";
import { fetchOgImageDataUri } from "@/lib/og/fetch-og-image-bytes";
import { buildPublicShowcasePayload } from "@/lib/vehicles/public-showcase-data";
import { loadShowcaseStorageImageBytes } from "@/lib/vehicles/load-showcase-storage-image";
import { loadVehicleSilhouetteBytes } from "@/lib/vehicles/load-silhouette-bytes";
import { isLikelyImageBytes } from "@/lib/vehicles/silhouette-bytes";
import { resolveVehicleCatalogImage } from "@/lib/vehicles/vehicle-image";
import type { Document, Vehicle } from "@/types/database";

/** Relative hero URL for preview metadata (showcase / catalog). */
export function resolveShareCardHeroPath(
  vehicle: Vehicle,
  documents: Document[],
): string | null {
  const payload = buildPublicShowcasePayload(vehicle, documents);
  const catalog = resolveVehicleCatalogImage(vehicle.make, vehicle.model);
  return payload.profile.heroImageSrc ?? catalog?.src ?? null;
}

function galleryStorageSrcFromPhotoSrc(photoSrc: string): string | null {
  try {
    const parsed = new URL(photoSrc, "http://localhost");
    return parsed.searchParams.get("src")?.trim() || null;
  } catch {
    return null;
  }
}

async function loadGalleryHeroBytes(
  vehicle: Vehicle,
  documents: Document[],
): Promise<Uint8Array | null> {
  const payload = buildPublicShowcasePayload(vehicle, documents);

  for (const photo of payload.photos) {
    if (photo.id === "silhouette") {
      continue;
    }

    const storageSrc = galleryStorageSrcFromPhotoSrc(photo.src);
    if (!storageSrc) {
      continue;
    }

    const bytes = await loadShowcaseStorageImageBytes(vehicle.id, storageSrc);
    if (bytes && isLikelyImageBytes(bytes)) {
      return bytes;
    }
  }

  return null;
}

async function loadCatalogHeroBytes(
  vehicle: Vehicle,
  fetchOrigin?: string,
): Promise<Uint8Array | null> {
  const catalog = resolveVehicleCatalogImage(vehicle.make, vehicle.model);
  if (!catalog?.src) {
    return null;
  }

  const absolute = resolveAbsoluteAssetUrl(catalog.src, fetchOrigin);
  const remote = await fetchOgImageDataUri(absolute);
  if (!remote.ok) {
    return null;
  }

  try {
    const base64 = remote.dataUri.split(",")[1];
    if (!base64) {
      return null;
    }
    return Uint8Array.from(Buffer.from(base64, "base64"));
  } catch {
    return null;
  }
}

/** Silhouette storage → gallery documents → catalog / demo HTTP. */
export async function loadShareCardHeroBytes(
  vehicle: Vehicle,
  documents: Document[],
  options?: { fetchOrigin?: string },
): Promise<Uint8Array | null> {
  const silhouette = await loadVehicleSilhouetteBytes(vehicle.id);
  if (silhouette && isLikelyImageBytes(silhouette)) {
    return silhouette;
  }

  const gallery = await loadGalleryHeroBytes(vehicle, documents);
  if (gallery) {
    return gallery;
  }

  const heroPath = resolveShareCardHeroPath(vehicle, documents);
  if (heroPath?.startsWith("/demo/")) {
    const absolute = resolveAbsoluteAssetUrl(heroPath, options?.fetchOrigin);
    const remote = await fetchOgImageDataUri(absolute);
    if (remote.ok) {
      try {
        const base64 = remote.dataUri.split(",")[1];
        if (base64) {
          return Uint8Array.from(Buffer.from(base64, "base64"));
        }
      } catch {
        /* fall through */
      }
    }
  }

  return loadCatalogHeroBytes(vehicle, options?.fetchOrigin);
}
