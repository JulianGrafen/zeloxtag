import { DOCUMENT_BUCKET } from "@/lib/documents/constants";
import { filterManualVehicleEntries } from "@/lib/documents/manual-entries";
import { documentMediaKind } from "@/lib/documents/viewable-url";
import {
  vehicleDynoChartObjectPath,
} from "@/lib/vehicles/dyno-chart-constants";
import {
  legacySilhouetteObjectPath,
  SILHOUETTE_BUCKET,
  vehiclePhotoObjectPath,
} from "@/lib/vehicles/silhouette-constants";
import {
  imageContentTypeFromBytes,
  isLikelyImageBytes,
} from "@/lib/vehicles/silhouette-bytes";
import { storagePathFromPublicOrAuthenticatedUrl } from "@/lib/security/file-upload";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Document } from "@/types/database";

import type { ExposePdfImage } from "./types";

function bytesToDataUri(bytes: Uint8Array, contentType: string): string {
  const base64 = Buffer.from(bytes).toString("base64");
  return `data:${contentType};base64,${base64}`;
}

async function downloadStorageObject(
  bucket: string,
  objectPath: string,
): Promise<Uint8Array | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.storage.from(bucket).download(objectPath);
  if (error || !data) return null;
  return new Uint8Array(await data.arrayBuffer());
}

async function downloadRemoteUrl(url: string): Promise<Uint8Array | null> {
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return null;
    return new Uint8Array(await response.arrayBuffer());
  } catch {
    return null;
  }
}

async function toImageDataUri(
  bytes: Uint8Array,
  id: string,
  alt: string,
): Promise<ExposePdfImage | null> {
  if (!isLikelyImageBytes(bytes)) return null;
  const contentType = imageContentTypeFromBytes(bytes);
  return {
    id,
    alt,
    dataUri: bytesToDataUri(bytes, contentType),
  };
}

export async function fetchHeroImage(
  vehicleId: string,
  vehicleLabel: string,
  silhouetteUrl: string | null,
): Promise<ExposePdfImage | null> {
  const objectPaths = [
    vehiclePhotoObjectPath(vehicleId),
    legacySilhouetteObjectPath(vehicleId),
  ];

  for (const objectPath of objectPaths) {
    const bytes = await downloadStorageObject(SILHOUETTE_BUCKET, objectPath);
    if (!bytes) continue;
    const image = await toImageDataUri(bytes, "hero", vehicleLabel);
    if (image) return image;
  }

  if (silhouetteUrl?.startsWith("http")) {
    const bytes = await downloadRemoteUrl(silhouetteUrl);
    if (bytes) {
      return toImageDataUri(bytes, "hero-remote", vehicleLabel);
    }
  }

  return null;
}

export async function fetchGalleryImages(
  vehicleId: string,
  documents: Document[],
  maxCount = 4,
): Promise<ExposePdfImage[]> {
  const images: ExposePdfImage[] = [];
  const seen = new Set<string>();

  for (const entry of filterManualVehicleEntries(documents)) {
    if (entry.category !== "tuning") continue;
    if (documentMediaKind(entry.file_url) !== "image") continue;
    if (!entry.file_url.startsWith("http")) continue;

    const storagePath = storagePathFromPublicOrAuthenticatedUrl(
      entry.file_url,
      DOCUMENT_BUCKET,
    );
    if (!storagePath || !storagePath.startsWith(`${vehicleId}/`)) continue;
    if (seen.has(storagePath)) continue;
    seen.add(storagePath);

    const bytes = await downloadStorageObject(DOCUMENT_BUCKET, storagePath);
    if (!bytes) continue;

    const image = await toImageDataUri(bytes, entry.id, entry.title);
    if (image) images.push(image);
    if (images.length >= maxCount) break;
  }

  return images;
}

export type DynoChartFetchResult = {
  image: ExposePdfImage | null;
  pdfNote: string | null;
};

export async function fetchDynoChartImage(
  vehicleId: string,
): Promise<DynoChartFetchResult> {
  const objectPath = vehicleDynoChartObjectPath(vehicleId);
  const bytes = await downloadStorageObject(DOCUMENT_BUCKET, objectPath);
  if (!bytes) {
    return { image: null, pdfNote: null };
  }

  const image = await toImageDataUri(bytes, "dyno", "Leistungsdiagramm");
  if (image) {
    return { image, pdfNote: null };
  }

  return {
    image: null,
    pdfNote:
      "Leistungsdiagramm als PDF hinterlegt — im ZeloxTag-Profil einsehbar.",
  };
}
