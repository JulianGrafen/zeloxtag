import "server-only";

import { createCanvas, loadImage } from "@napi-rs/canvas";

export type ImageOutputFormat = "png" | "jpeg";

export async function getImageDimensions(
  bytes: Buffer,
): Promise<{ width: number; height: number } | null> {
  try {
    const img = await loadImage(bytes);
    return { width: img.width, height: img.height };
  } catch {
    return null;
  }
}

export async function resizeImageToMaxEdge(
  bytes: Buffer,
  maxEdgePx: number,
  format: ImageOutputFormat = "png",
  jpegQuality = 85,
): Promise<Buffer> {
  const img = await loadImage(bytes);
  const width = img.width;
  const height = img.height;
  const longEdge = Math.max(width, height);

  let targetW = width;
  let targetH = height;
  if (longEdge > maxEdgePx) {
    const scale = maxEdgePx / longEdge;
    targetW = Math.max(1, Math.round(width * scale));
    targetH = Math.max(1, Math.round(height * scale));
  }

  const canvas = createCanvas(targetW, targetH);
  const ctx = canvas.getContext("2d");
  if (format === "jpeg") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, targetW, targetH);
  }
  ctx.drawImage(img, 0, 0, targetW, targetH);

  if (format === "jpeg") {
    return canvas.toBuffer("image/jpeg", jpegQuality);
  }
  return canvas.toBuffer("image/png");
}

export async function encodeImageAsPng(bytes: Buffer): Promise<Buffer> {
  const img = await loadImage(bytes);
  const canvas = createCanvas(img.width, img.height);
  canvas.getContext("2d").drawImage(img, 0, 0);
  return canvas.toBuffer("image/png");
}
