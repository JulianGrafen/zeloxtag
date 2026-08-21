import "server-only";

import { imageContentTypeFromBytes } from "@/lib/vehicles/silhouette-bytes";

import { getImageDimensions, resizeImageToMaxEdge } from "./server-canvas";

const WEB_MAX_EDGE_PX = 960;
const WEB_TARGET_MAX_BYTES = 280_000;

export type OptimizedWebImage = {
  body: Buffer;
  contentType: string;
};

/**
 * Downscale and re-encode large vehicle images for dashboard / catalog delivery.
 */
export async function optimizeWebImageBytes(
  bytes: Uint8Array,
): Promise<OptimizedWebImage> {
  const input = Buffer.from(bytes);
  const contentType = imageContentTypeFromBytes(bytes);

  if (input.length <= WEB_TARGET_MAX_BYTES) {
    return { body: input, contentType };
  }

  const dims = await getImageDimensions(input);
  const longEdge = dims ? Math.max(dims.width, dims.height) : WEB_MAX_EDGE_PX + 1;
  const needsResize = longEdge > WEB_MAX_EDGE_PX;

  if (!needsResize && input.length <= WEB_TARGET_MAX_BYTES) {
    return { body: input, contentType };
  }

  const png = await resizeImageToMaxEdge(
    input,
    WEB_MAX_EDGE_PX,
    "png",
    90,
    contentType,
  );

  if (png.length <= WEB_TARGET_MAX_BYTES || png.length < input.length) {
    return { body: png, contentType: "image/png" };
  }

  const jpeg = await resizeImageToMaxEdge(
    input,
    WEB_MAX_EDGE_PX,
    "jpeg",
    82,
    contentType,
  );

  return { body: jpeg, contentType: "image/jpeg" };
}
