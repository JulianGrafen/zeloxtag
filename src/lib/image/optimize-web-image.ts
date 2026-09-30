import "server-only";

import { imageContentTypeFromBytes } from "@/lib/vehicles/silhouette-bytes";

import { getImageDimensions, resizeImageToMaxEdge } from "./server-canvas";

const WEB_MAX_EDGE_PX = 960;
const WEB_TARGET_MAX_BYTES = 280_000;
const THUMB_TARGET_MAX_BYTES = 96_000;

export type OptimizeWebImageOptions = {
  maxEdgePx?: number;
};

export type OptimizedWebImage = {
  body: Buffer;
  contentType: string;
};

/**
 * Downscale and re-encode large vehicle images for dashboard / catalog delivery.
 */
export async function optimizeWebImageBytes(
  bytes: Uint8Array,
  options?: OptimizeWebImageOptions,
): Promise<OptimizedWebImage> {
  const maxEdgePx = options?.maxEdgePx ?? WEB_MAX_EDGE_PX;
  const targetMaxBytes =
    maxEdgePx <= 400 ? THUMB_TARGET_MAX_BYTES : WEB_TARGET_MAX_BYTES;

  const input = Buffer.from(bytes);
  const contentType = imageContentTypeFromBytes(bytes);

  const dims = await getImageDimensions(input, contentType);
  const longEdge = dims ? Math.max(dims.width, dims.height) : maxEdgePx + 1;
  const needsResize = longEdge > maxEdgePx;

  if (!needsResize && input.length <= targetMaxBytes) {
    return { body: input, contentType };
  }

  const png = await resizeImageToMaxEdge(
    input,
    maxEdgePx,
    "png",
    90,
    contentType,
  );

  if (png.length <= targetMaxBytes || png.length < input.length) {
    return { body: png, contentType: "image/png" };
  }

  const jpeg = await resizeImageToMaxEdge(
    input,
    maxEdgePx,
    "jpeg",
    82,
    contentType,
  );

  return { body: jpeg, contentType: "image/jpeg" };
}
