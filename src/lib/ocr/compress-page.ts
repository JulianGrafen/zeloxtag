/**
 * Page prep: center-crop to A4, downscale, JPEG-compress (natural colors, no scan filter).
 */

import { loadImageFromFile } from "@/lib/utils/image-loader";
import { A4_ASPECT } from "@/lib/utils/image-optimizer";

/** Long edge for A4 portrait OCR pages (~200 DPI on A4). */
export const PAGE_COMPRESS_MAX_WIDTH_PX = 2000;
export const PAGE_COMPRESS_TARGET_BYTES = 480 * 1024;
export const PAGE_JPEG_QUALITY = 0.88;
export const PAGE_JPEG_QUALITY_FLOOR = 0.68;

export type CompressedPage = {
  id: string;
  /** A4-cropped, compressed JPEG for PDF assembly / upload. */
  blob: Blob;
  /** Object URL for UI thumbnails (caller should revoke). */
  previewUrl: string;
  width: number;
  height: number;
  sourceName: string;
  byteLength: number;
};

export type A4CropRect = {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
};

/**
 * Center-crop source pixels to A4 portrait aspect (210∶297).
 */
export function computeA4CropRect(
  sourceWidth: number,
  sourceHeight: number,
): A4CropRect {
  const width = Math.max(1, sourceWidth);
  const height = Math.max(1, sourceHeight);
  const sourceAspect = width / height;

  if (sourceAspect > A4_ASPECT) {
    const sw = Math.max(1, Math.round(height * A4_ASPECT));
    return {
      sx: Math.max(0, Math.round((width - sw) / 2)),
      sy: 0,
      sw,
      sh: height,
    };
  }

  const sh = Math.max(1, Math.round(width / A4_ASPECT));
  return {
    sx: 0,
    sy: Math.max(0, Math.round((height - sh) / 2)),
    sw: width,
    sh,
  };
}

function canvasToJpegBlob(
  canvas: HTMLCanvasElement,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error("JPEG-Kompression fehlgeschlagen."));
        else resolve(blob);
      },
      "image/jpeg",
      quality,
    );
  });
}

function loadImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Bild konnte nicht geladen werden."));
    };
    image.src = url;
  });
}

/**
 * Crop to A4 portrait, resize, JPEG-compress for Document Intelligence.
 */
export async function compressPageImage(
  file: File | Blob,
  sourceName = "page.jpg",
): Promise<CompressedPage> {
  const image =
    file instanceof File
      ? await loadImageFromFile(file)
      : await loadImageFromBlob(file);

  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  const crop = computeA4CropRect(sourceWidth, sourceHeight);

  const outWidth = Math.min(PAGE_COMPRESS_MAX_WIDTH_PX, crop.sw);
  const outHeight = Math.max(1, Math.round(outWidth / A4_ASPECT));

  const canvas = document.createElement("canvas");
  canvas.width = outWidth;
  canvas.height = outHeight;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    throw new Error("Canvas ist in diesem Browser nicht verfügbar.");
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, outWidth, outHeight);
  ctx.drawImage(
    image,
    crop.sx,
    crop.sy,
    crop.sw,
    crop.sh,
    0,
    0,
    outWidth,
    outHeight,
  );
  let quality = PAGE_JPEG_QUALITY;
  let blob = await canvasToJpegBlob(canvas, quality);
  while (blob.size > PAGE_COMPRESS_TARGET_BYTES && quality > PAGE_JPEG_QUALITY_FLOOR) {
    quality -= 0.06;
    blob = await canvasToJpegBlob(canvas, quality);
  }

  canvas.width = 0;
  canvas.height = 0;

  const previewUrl = URL.createObjectURL(blob);
  const baseName =
    file instanceof File ? file.name.replace(/\.[^.]+$/, "") || "page" : "page";

  return {
    id: `page_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    blob,
    previewUrl,
    width: outWidth,
    height: outHeight,
    sourceName: `${baseName || sourceName.replace(/\.[^.]+$/, "")}-a4.jpg`,
    byteLength: blob.size,
  };
}

export function revokeCompressedPages(pages: CompressedPage[]): void {
  for (const page of pages) {
    URL.revokeObjectURL(page.previewUrl);
  }
}
