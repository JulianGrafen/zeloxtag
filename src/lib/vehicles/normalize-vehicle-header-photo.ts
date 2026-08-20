/**
 * Convert inbound vehicle photos (JPEG/HEIC/WebP/PNG) to PNG for storage.
 */

import { getImageDimensions, resizeImageToMaxEdge } from "@/lib/image/server-canvas";

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
 * JPEG (and other formats) → PNG, resize. No background removal.
 */
export async function normalizeVehicleHeaderPhoto(
  bytes: Uint8Array | Buffer,
): Promise<Buffer> {
  const input = Buffer.from(bytes);

  if (isPngBytes(input) && input.byteLength <= HEADER_PHOTO_MAX_EDGE * HEADER_PHOTO_MAX_EDGE * 4) {
    const dims = await getImageDimensions(input);
    if (
      dims &&
      dims.width <= HEADER_PHOTO_MAX_EDGE &&
      dims.height <= HEADER_PHOTO_MAX_EDGE
    ) {
      return input;
    }
  }

  try {
    return await resizeImageToMaxEdge(input, HEADER_PHOTO_MAX_EDGE, "png");
  } catch {
    throw new HeaderPhotoNormalizeError(
      "Das Foto konnte nicht verarbeitet werden.",
    );
  }
}
