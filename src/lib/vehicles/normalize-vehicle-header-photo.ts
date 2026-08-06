/**
 * Light server-side prep for owner vehicle photos (rotate + resize, no cutout).
 */

import sharp from "sharp";

/** Max edge before JPEG encode — keeps uploads fast on mobile. */
export const HEADER_PHOTO_MAX_EDGE = 1600;

export class HeaderPhotoNormalizeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HeaderPhotoNormalizeError";
  }
}

export async function normalizeVehicleHeaderPhoto(
  bytes: Uint8Array | Buffer,
): Promise<Buffer> {
  try {
    return await sharp(Buffer.from(bytes))
      .rotate()
      .resize(HEADER_PHOTO_MAX_EDGE, HEADER_PHOTO_MAX_EDGE, {
        fit: "inside",
        withoutEnlargement: true,
        kernel: sharp.kernel.lanczos3,
      })
      .jpeg({ quality: 88, mozjpeg: true })
      .toBuffer();
  } catch {
    throw new HeaderPhotoNormalizeError(
      "Das Foto konnte nicht verarbeitet werden.",
    );
  }
}
