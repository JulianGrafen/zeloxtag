/**
 * Client-side prep for vehicle photo uploads: resize + JPEG/HEIC → PNG.
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
  if (!mime || mime === "application/octet-stream") {
    return (
      /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name) || file.size > 0
    );
  }
  if (mime.startsWith("image/")) return true;
  if (IMAGE_MIME.has(mime)) return true;
  return /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name);
}

async function rasterToPngFile(file: File, baseName: string): Promise<File> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "none" });
  const maxEdge = SILHOUETTE_CLIENT_MAX_EDGE_PX;
  const scale = Math.min(
    1,
    maxEdge / Math.max(bitmap.width, bitmap.height, 1),
  );
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new SilhouetteCompressionError(
      "Foto konnte nicht vorbereitet werden.",
    );
  }

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const pngBlob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/png", 0.92);
  });

  if (!pngBlob || pngBlob.size < 32) {
    throw new SilhouetteCompressionError(
      "Foto konnte nicht als PNG gespeichert werden.",
    );
  }

  return new File([pngBlob], `${baseName}.png`, {
    type: "image/png",
    lastModified: Date.now(),
  });
}

/**
 * Shrink photos and convert JPEG/HEIC/WebP → PNG before POST /api/vehicle/photo.
 */
export async function compressSilhouetteImage(file: File): Promise<File> {
  if (!isImageFile(file)) {
    throw new SilhouetteCompressionError(
      "Bitte ein Foto (JPEG, PNG oder WebP) wählen.",
    );
  }

  const baseName = file.name.replace(/\.[^.]+$/, "") || "vehicle-photo";

  try {
    const compressed = await imageCompression(file, {
      maxSizeMB: SILHOUETTE_CLIENT_MAX_SIZE_MB,
      maxWidthOrHeight: SILHOUETTE_CLIENT_MAX_EDGE_PX,
      useWebWorker: false,
      fileType: "image/jpeg",
      initialQuality: 0.85,
    });

    return await rasterToPngFile(
      new File([compressed], `${baseName}.jpg`, {
        type: "image/jpeg",
        lastModified: Date.now(),
      }),
      baseName,
    );
  } catch (error) {
    if (error instanceof SilhouetteCompressionError) throw error;
    throw new SilhouetteCompressionError(
      "Bild konnte nicht komprimiert werden.",
    );
  }
}
