/**
 * Convert inbound vehicle photos (JPEG/HEIC/WebP/PNG) to PNG for storage.
 */

import sharp from "sharp";

import { isJpegBytes, isPngBytes } from "./silhouette-bytes";

/** Max edge before PNG encode — keeps uploads fast on mobile. */
export const HEADER_PHOTO_MAX_EDGE = 1600;

export class HeaderPhotoNormalizeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HeaderPhotoNormalizeError";
  }
}

/**
 * JPEG (and other formats) → PNG, rotate + resize. No background removal.
 */
export async function normalizeVehicleHeaderPhoto(
  bytes: Uint8Array | Buffer,
): Promise<Buffer> {
  const input = Buffer.from(bytes);

  if (isPngBytes(input) && input.byteLength <= HEADER_PHOTO_MAX_EDGE * HEADER_PHOTO_MAX_EDGE * 4) {
    try {
      const meta = await sharp(input).metadata();
      if (
        meta.format === "png" &&
        (meta.width ?? 0) <= HEADER_PHOTO_MAX_EDGE &&
        (meta.height ?? 0) <= HEADER_PHOTO_MAX_EDGE
      ) {
        return input;
      }
    } catch {
      /* fall through to full normalize */
    }
  }

  try {
    const pipeline = sharp(input).rotate().resize(
      HEADER_PHOTO_MAX_EDGE,
      HEADER_PHOTO_MAX_EDGE,
      {
        fit: "inside",
        withoutEnlargement: true,
        kernel: sharp.kernel.lanczos3,
      },
    );

    if (isJpegBytes(input)) {
      pipeline.flatten({ background: "#ffffff" });
    }

    return await pipeline
      .png({ compressionLevel: 8, effort: 6 })
      .toBuffer();
  } catch {
    throw new HeaderPhotoNormalizeError(
      "Das Foto konnte nicht verarbeitet werden.",
    );
  }
}
