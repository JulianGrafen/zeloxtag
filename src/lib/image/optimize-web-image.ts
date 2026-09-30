import "server-only";

import {
  imageContentTypeFromBytes,
  isLikelyImageBytes,
} from "@/lib/vehicles/silhouette-bytes";

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

  const resolvedContentType =
    contentType === "application/octet-stream" && isLikelyImageBytes(bytes)
      ? imageContentTypeFromBytes(bytes)
      : contentType;

  const dims = await getImageDimensions(input, resolvedContentType);
  const longEdge = dims ? Math.max(dims.width, dims.height) : 0;
  const needsResize = dims ? longEdge > maxEdgePx : false;

  if (
    (!needsResize && input.length <= targetMaxBytes) ||
    (!dims && isLikelyImageBytes(bytes))
  ) {
    return { body: input, contentType: resolvedContentType };
  }

  try {
    const png = await resizeImageToMaxEdge(
      input,
      maxEdgePx,
      "png",
      90,
      resolvedContentType,
    );

    if (png.length <= targetMaxBytes || png.length < input.length) {
      return { body: png, contentType: "image/png" };
    }

    const jpeg = await resizeImageToMaxEdge(
      input,
      maxEdgePx,
      "jpeg",
      82,
      resolvedContentType,
    );

    return { body: jpeg, contentType: "image/jpeg" };
  } catch {
    if (isLikelyImageBytes(bytes)) {
      return { body: input, contentType: resolvedContentType };
    }
    throw new Error("Vehicle image could not be optimized.");
  }
}
