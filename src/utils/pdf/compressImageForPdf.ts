import { loadImageFromFile } from "@/lib/utils/image-loader";

import { computeScaledDimensions } from "./a4-layout";

export const PDF_IMAGE_MAX_DIMENSION_PX = 1500;
export const PDF_IMAGE_JPEG_QUALITY = 0.7;

export type CompressedImageForPdf = {
  dataUrl: string;
  widthPx: number;
  heightPx: number;
};

function releaseCanvas(canvas: HTMLCanvasElement): void {
  canvas.width = 0;
  canvas.height = 0;
}

/**
 * Downscale a user image on an off-screen canvas and export as JPEG base64
 * suitable for jsPDF injection.
 */
export async function compressImageForPdf(
  file: File,
  maxDimensionPx: number = PDF_IMAGE_MAX_DIMENSION_PX,
  jpegQuality: number = PDF_IMAGE_JPEG_QUALITY,
): Promise<CompressedImageForPdf> {
  const image = await loadImageFromFile(file);

  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  const { widthPx, heightPx } = computeScaledDimensions(
    sourceWidth,
    sourceHeight,
    maxDimensionPx,
  );

  const canvas = document.createElement("canvas");
  canvas.width = widthPx;
  canvas.height = heightPx;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    releaseCanvas(canvas);
    throw new Error("Canvas ist in diesem Browser nicht verfügbar.");
  }

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, widthPx, heightPx);
  ctx.drawImage(image, 0, 0, widthPx, heightPx);

  const dataUrl = canvas.toDataURL("image/jpeg", jpegQuality);
  releaseCanvas(canvas);

  return {
    dataUrl,
    widthPx,
    heightPx,
  };
}
