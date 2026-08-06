/**
 * Client-side compression for silhouette onboarding uploads.
 */

import imageCompression from "browser-image-compression";

import {
  SILHOUETTE_CLIENT_MAX_EDGE_PX,
  SILHOUETTE_CLIENT_MAX_SIZE_MB,
} from "./silhouette-constants";

export class SilhouetteCompressionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SilhouetteCompressionError";
  }
}

const IMAGE_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

function isImageFile(file: File): boolean {
  const mime = file.type.toLowerCase();
  // iOS Photos often sends empty MIME or generic image/* from the gallery.
  if (!mime || mime === "application/octet-stream") {
    return (
      /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name) || file.size > 0
    );
  }
  if (mime.startsWith("image/")) return true;
  if (IMAGE_MIME.has(mime)) return true;
  return /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name);
}

/**
 * Shrink transparent cutout PNGs before POST /api/vehicle/remove-bg.
 */
export async function shrinkCutoutPng(file: File): Promise<File> {
  if (typeof window === "undefined") return file;

  const bitmap = await createImageBitmap(file);
  const maxEdge = 1200;
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height, 1));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }

  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/png");
  });
  if (!blob || blob.size < 32) {
    return file;
  }

  const baseName = file.name.replace(/\.[^.]+$/, "") || "vehicle-side";
  return new File([blob], `${baseName}-cutout.png`, {
    type: "image/png",
    lastModified: Date.now(),
  });
}

/**
 * Shrink side-profile photos before POST /api/vehicle/remove-bg.
 */
export async function compressSilhouetteImage(file: File): Promise<File> {
  if (!isImageFile(file)) {
    throw new SilhouetteCompressionError(
      "Bitte ein Foto (JPEG, PNG oder WebP) wählen.",
    );
  }

  try {
    const compressed = await imageCompression(file, {
      maxSizeMB: SILHOUETTE_CLIENT_MAX_SIZE_MB,
      maxWidthOrHeight: SILHOUETTE_CLIENT_MAX_EDGE_PX,
      // Main-thread only: blob workers + COEP isolation are flaky on mobile Safari.
      useWebWorker: false,
      fileType: "image/jpeg",
      initialQuality: 0.85,
    });

    const name = file.name.replace(/\.[^.]+$/, "") || "vehicle-side";
    return new File([compressed], `${name}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch {
    throw new SilhouetteCompressionError(
      "Bild konnte nicht komprimiert werden.",
    );
  }
}
