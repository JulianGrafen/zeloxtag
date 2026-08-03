/**
 * Client-side invoice / document image optimization (no external APIs).
 * Produces a CamScanner-style monochrome page optimized for readability
 * and small PDF payloads.
 */

import { loadImageFromFile } from "./image-loader";

/** A4 portrait aspect ratio (width / height). */
export const A4_ASPECT = 210 / 297;

export const OPTIMIZER_MAX_WIDTH_PX = 1600;
export const OPTIMIZER_TARGET_MAX_BYTES = 300 * 1024;

export type OptimizedImageResult = {
  /** Processed canvas (grayscale, contrast-boosted, resized). */
  canvas: HTMLCanvasElement;
  /** JPEG data URL of the optimized image. */
  dataUrl: string;
  /** Approximate JPEG byte size. */
  byteLength: number;
  width: number;
  height: number;
};

export type OptimizeImageOptions = {
  maxWidth?: number;
  /** Target JPEG payload size in bytes (best-effort). */
  maxBytes?: number;
  /** Contrast multiplier (>1 sharpens ink vs paper). */
  contrast?: number;
  /** Brightness offset in [-100, 100]. */
  brightness?: number;
};

/**
 * Compute draw size: fit inside A4-proportion frame with max width.
 */
export function computeTargetSize(
  sourceWidth: number,
  sourceHeight: number,
  maxWidth = OPTIMIZER_MAX_WIDTH_PX,
): { width: number; height: number } {
  const maxHeight = Math.round(maxWidth / A4_ASPECT);
  const scale = Math.min(
    1,
    maxWidth / sourceWidth,
    maxHeight / sourceHeight,
  );

  return {
    width: Math.max(1, Math.round(sourceWidth * scale)),
    height: Math.max(1, Math.round(sourceHeight * scale)),
  };
}

function percentileThreshold(
  histogram: Uint32Array,
  total: number,
  percentile: number,
): number {
  const target = total * percentile;
  let cumulative = 0;
  for (let i = 0; i < 256; i += 1) {
    cumulative += histogram[i];
    if (cumulative >= target) return i;
  }
  return 255;
}

/**
 * Professional scan filter: grayscale + auto levels + contrast/ink boost.
 */
export function applyDocumentScanFilter(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  contrast = 1.35,
  brightness = 8,
): void {
  const imageData = ctx.getImageData(0, 0, width, height);
  const { data } = imageData;
  const pixelCount = width * height;

  const histogram = new Uint32Array(256);
  const grayBuffer = new Float32Array(pixelCount);

  for (let p = 0, i = 0; p < pixelCount; p += 1, i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    grayBuffer[p] = gray;
    histogram[Math.max(0, Math.min(255, Math.round(gray)))] += 1;
  }

  // Drop extreme shadows/highlights so paper → white, ink stays dark.
  const low = percentileThreshold(histogram, pixelCount, 0.02);
  const high = Math.max(
    low + 16,
    percentileThreshold(histogram, pixelCount, 0.98),
  );
  const range = high - low;

  for (let p = 0, i = 0; p < pixelCount; p += 1, i += 4) {
    let value = ((grayBuffer[p] - low) / range) * 255;
    value = ((value / 255 - 0.5) * contrast + 0.5) * 255 + brightness;

    if (value < 140) {
      value *= 0.78;
    } else if (value > 205) {
      value = 255 - (255 - value) * 0.25;
    }

    value = Math.max(0, Math.min(255, value));
    data[i] = value;
    data[i + 1] = value;
    data[i + 2] = value;
  }

  ctx.putImageData(imageData, 0, 0);
}

function dataUrlByteLength(dataUrl: string): number {
  const base64 = dataUrl.split(",")[1] ?? "";
  return Math.floor((base64.length * 3) / 4);
}

function canvasToJpegDataUrl(
  canvas: HTMLCanvasElement,
  quality: number,
): string {
  return canvas.toDataURL("image/jpeg", quality);
}

function encodeOptimizedCanvas(
  canvas: HTMLCanvasElement,
  maxBytes: number,
): OptimizedImageResult {
  let quality = 0.84;
  let dataUrl = canvasToJpegDataUrl(canvas, quality);
  let byteLength = dataUrlByteLength(dataUrl);

  while (byteLength > maxBytes && quality > 0.42) {
    quality -= 0.08;
    dataUrl = canvasToJpegDataUrl(canvas, quality);
    byteLength = dataUrlByteLength(dataUrl);
  }

  return {
    canvas,
    dataUrl,
    byteLength,
    width: canvas.width,
    height: canvas.height,
  };
}

/**
 * Apply professional scan filter to an already flattened document canvas.
 */
export function optimizeDocumentCanvas(
  source: HTMLCanvasElement,
  options: OptimizeImageOptions = {},
): OptimizedImageResult {
  const maxWidth = options.maxWidth ?? OPTIMIZER_MAX_WIDTH_PX;
  const maxBytes = options.maxBytes ?? OPTIMIZER_TARGET_MAX_BYTES;
  const contrast = options.contrast ?? 1.35;
  const brightness = options.brightness ?? 8;

  const { width, height } = computeTargetSize(
    source.width,
    source.height,
    maxWidth,
  );

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    throw new Error("Canvas ist in diesem Browser nicht verfügbar.");
  }

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(source, 0, 0, width, height);
  applyDocumentScanFilter(ctx, width, height, contrast, brightness);

  return encodeOptimizedCanvas(canvas, maxBytes);
}

/**
 * Optimize a raw camera / gallery image (no perspective crop).
 */
export async function optimizeDocumentImage(
  file: File,
  options: OptimizeImageOptions = {},
): Promise<OptimizedImageResult> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Nur Bilddateien werden unterstützt.");
  }

  const image = await loadImageFromFile(file);
  const { width, height } = computeTargetSize(
    image.naturalWidth || image.width,
    image.naturalHeight || image.height,
    options.maxWidth ?? OPTIMIZER_MAX_WIDTH_PX,
  );

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    throw new Error("Canvas ist in diesem Browser nicht verfügbar.");
  }

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(image, 0, 0, width, height);

  return optimizeDocumentCanvas(canvas, options);
}
