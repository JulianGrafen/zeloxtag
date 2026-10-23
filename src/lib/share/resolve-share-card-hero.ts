import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

import { filterShowcaseGalleryDocuments } from "@/lib/documents/showcase-gallery";
import { resolveAbsoluteAssetUrl } from "@/lib/og/resolve-absolute-url";
import { fetchOgImageDataUri } from "@/lib/og/fetch-og-image-bytes";
import { resolvePublicAppOrigin } from "@/lib/api/resolve-api-base-url";
import { buildPublicShowcasePayload } from "@/lib/vehicles/public-showcase-data";
import { filterPublicShowcaseDocuments } from "@/lib/vehicles/public-showcase-documents";
import { loadShowcaseStorageImageBytes } from "@/lib/vehicles/load-showcase-storage-image";
import { loadVehicleSilhouetteBytes } from "@/lib/vehicles/load-silhouette-bytes";
import { isLikelyImageBytes } from "@/lib/vehicles/silhouette-bytes";
import { resolveVehicleCatalogImage } from "@/lib/vehicles/vehicle-image";
import type { Document, Vehicle } from "@/types/database";

const HERO_HTTP_FETCH_TIMEOUT_MS = 8_000;
const CATALOG_FILENAME_RE = /^[a-z0-9-]+\.png$/i;

async function loadCatalogHeroBytesFromDisk(
  catalogSrc: string,
): Promise<Uint8Array | null> {
  const filename = catalogSrc.split("/").pop()?.split("?")[0]?.trim();
  if (!filename || !CATALOG_FILENAME_RE.test(filename)) {
    return null;
  }
  try {
    const filePath = path.join(process.cwd(), "public", "vehicles", filename);
    const bytes = await readFile(filePath);
    return isLikelyImageBytes(bytes) ? new Uint8Array(bytes) : null;
  } catch {
    return null;
  }
}

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

async function fetchHeroImageBytesFromUrl(
  absoluteUrl: string,
  cookieHeader?: string,
): Promise<Uint8Array | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HERO_HTTP_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(absoluteUrl, {
      signal: controller.signal,
      cache: "no-store",
      headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
    });
    if (!response.ok) {
      return null;
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    return isLikelyImageBytes(bytes) ? bytes : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
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

  for (const entry of filterShowcaseGalleryDocuments(
    filterPublicShowcaseDocuments(documents),
  )) {
    const bytes = await loadShowcaseStorageImageBytes(
      vehicle.id,
      entry.file_url,
    );
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

  const fromDisk = await loadCatalogHeroBytesFromDisk(catalog.src);
  if (fromDisk) {
    return fromDisk;
  }

  const origin = fetchOrigin ?? resolvePublicAppOrigin();
  const absolute = resolveAbsoluteAssetUrl(catalog.src, origin);
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

async function loadHeroPathHttpBytes(
  heroPath: string,
  options?: { fetchOrigin?: string; cookieHeader?: string },
): Promise<Uint8Array | null> {
  const origin = options?.fetchOrigin ?? resolvePublicAppOrigin();
  const absolute = resolveAbsoluteAssetUrl(heroPath, origin);
  if (!absolute) {
    return null;
  }
  return fetchHeroImageBytesFromUrl(absolute, options?.cookieHeader);
}

/** Silhouette storage → gallery documents → hero URL HTTP → catalog / demo HTTP. */
export async function loadShareCardHeroBytes(
  vehicle: Vehicle,
  documents: Document[],
  options?: { fetchOrigin?: string; cookieHeader?: string },
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

  if (heroPath?.includes("/api/vehicle/catalog/")) {
    const fromCatalogPath = await loadCatalogHeroBytesFromDisk(heroPath);
    if (fromCatalogPath) {
      return fromCatalogPath;
    }
  }

  if (heroPath?.startsWith("/api/")) {
    const fromHeroPath = await loadHeroPathHttpBytes(heroPath, options);
    if (fromHeroPath) {
      return fromHeroPath;
    }
  }

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
