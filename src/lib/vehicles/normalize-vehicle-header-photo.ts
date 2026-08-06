/**
 * Normalize owner vehicle photos for the dashboard header frame (cover crop).
 */

import sharp from "sharp";

/** Matches the header frame aspect (4:3). */
export const HEADER_PHOTO = {
  width: 480,
  height: 360,
} as const;

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
      .resize(HEADER_PHOTO.width, HEADER_PHOTO.height, {
        fit: "cover",
        position: "centre",
        kernel: sharp.kernel.lanczos3,
      })
      .modulate({ brightness: 1.02, saturation: 1.05 })
      .png({ compressionLevel: 8, effort: 6 })
      .toBuffer();
  } catch {
    throw new HeaderPhotoNormalizeError(
      "Das Foto konnte nicht verarbeitet werden.",
    );
  }
}
