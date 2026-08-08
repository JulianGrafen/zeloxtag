/**
 * Automatic paper / document bounds detection for scan auto-crop.
 * Finds the brightest content region (invoice on darker background).
 */

import {
  defaultDocumentCorners,
  type Point2D,
  type QuadPoints,
} from "@/lib/utils/perspective";

export type PaperBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type DetectDocumentOptions = {
  /** Minimum detected area as a fraction of the image (0–1). */
  minAreaRatio?: number;
  /** Inset applied to detected bounds (fraction of shorter edge). */
  insetRatio?: number;
  /** Fallback inset when detection is unreliable. */
  fallbackInsetRatio?: number;
};

const DEFAULT_OPTIONS: Required<DetectDocumentOptions> = {
  minAreaRatio: 0.12,
  insetRatio: 0.006,
  fallbackInsetRatio: 0.015,
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function toGray(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function sampleRegionMeanGray(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  x0: number,
  y0: number,
  regionWidth: number,
  regionHeight: number,
): number {
  const xStart = clamp(Math.floor(x0), 0, width - 1);
  const yStart = clamp(Math.floor(y0), 0, height - 1);
  const xEnd = clamp(Math.ceil(x0 + regionWidth), xStart + 1, width);
  const yEnd = clamp(Math.ceil(y0 + regionHeight), yStart + 1, height);

  let sum = 0;
  let count = 0;
  for (let y = yStart; y < yEnd; y += 1) {
    for (let x = xStart; x < xEnd; x += 1) {
      const i = (y * width + x) * 4;
      sum += toGray(data[i]!, data[i + 1]!, data[i + 2]!);
      count += 1;
    }
  }
  return count > 0 ? sum / count : 255;
}

function estimateBackgroundLevel(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): number {
  const patchW = Math.max(8, Math.round(width * 0.1));
  const patchH = Math.max(8, Math.round(height * 0.1));
  const samples = [
    sampleRegionMeanGray(data, width, height, 0, 0, patchW, patchH),
    sampleRegionMeanGray(
      data,
      width,
      height,
      width - patchW,
      0,
      patchW,
      patchH,
    ),
    sampleRegionMeanGray(
      data,
      width,
      height,
      0,
      height - patchH,
      patchW,
      patchH,
    ),
    sampleRegionMeanGray(
      data,
      width,
      height,
      width - patchW,
      height - patchH,
      patchW,
      patchH,
    ),
  ];
  samples.sort((a, b) => a - b);
  return samples[Math.floor(samples.length / 2)] ?? 40;
}

function insetBounds(
  bounds: PaperBounds,
  width: number,
  height: number,
  insetRatio: number,
): PaperBounds {
  const inset = Math.round(Math.min(bounds.width, bounds.height) * insetRatio);
  const x = clamp(bounds.x + inset, 0, width - 2);
  const y = clamp(bounds.y + inset, 0, height - 2);
  const right = clamp(bounds.x + bounds.width - inset, x + 1, width);
  const bottom = clamp(bounds.y + bounds.height - inset, y + 1, height);
  return {
    x,
    y,
    width: right - x,
    height: bottom - y,
  };
}

function boundsToQuad(bounds: PaperBounds): QuadPoints {
  const { x, y, width, height } = bounds;
  const right = x + width;
  const bottom = y + height;
  return [
    { x, y },
    { x: right, y },
    { x: right, y: bottom },
    { x, y: bottom },
  ];
}

function scaleBounds(bounds: PaperBounds, scale: number): PaperBounds {
  return {
    x: Math.round(bounds.x / scale),
    y: Math.round(bounds.y / scale),
    width: Math.max(1, Math.round(bounds.width / scale)),
    height: Math.max(1, Math.round(bounds.height / scale)),
  };
}

/**
 * Detect paper bounds from grayscale-like thresholding on raw RGBA pixels.
 * Exported for unit tests.
 */
export function detectPaperBoundsFromImageData(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  options: DetectDocumentOptions = {},
): PaperBounds | null {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const bg = estimateBackgroundLevel(data, width, height);
  const threshold = clamp(bg + Math.max(20, (255 - bg) * 0.28), 60, 245);

  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  let paperPixels = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      const gray = toGray(data[i]!, data[i + 1]!, data[i + 2]!);
      if (gray >= threshold) {
        paperPixels += 1;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (paperPixels === 0 || maxX <= minX || maxY <= minY) {
    return null;
  }

  const bounds: PaperBounds = {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };

  const areaRatio = (bounds.width * bounds.height) / (width * height);
  if (areaRatio < opts.minAreaRatio) {
    return null;
  }

  return insetBounds(bounds, width, height, opts.insetRatio);
}

/**
 * Detect document corners inside a canvas (axis-aligned paper on darker background).
 */
export function detectDocumentQuad(
  canvas: HTMLCanvasElement,
  options: DetectDocumentOptions = {},
): QuadPoints {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const analysisMaxWidth = 720;
  const scale =
    canvas.width > analysisMaxWidth ? analysisMaxWidth / canvas.width : 1;
  const analysisWidth = Math.max(1, Math.round(canvas.width * scale));
  const analysisHeight = Math.max(1, Math.round(canvas.height * scale));

  const analysisCanvas = document.createElement("canvas");
  analysisCanvas.width = analysisWidth;
  analysisCanvas.height = analysisHeight;
  const ctx = analysisCanvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    return defaultDocumentCorners(
      canvas.width,
      canvas.height,
      opts.fallbackInsetRatio,
    );
  }

  ctx.drawImage(canvas, 0, 0, analysisWidth, analysisHeight);
  const imageData = ctx.getImageData(0, 0, analysisWidth, analysisHeight);
  const bounds = detectPaperBoundsFromImageData(
    imageData.data,
    analysisWidth,
    analysisHeight,
    options,
  );

  if (!bounds) {
    return defaultDocumentCorners(
      canvas.width,
      canvas.height,
      opts.fallbackInsetRatio,
    );
  }

  const fullBounds = scaleBounds(bounds, scale);
  const clamped: PaperBounds = {
    x: clamp(fullBounds.x, 0, canvas.width - 2),
    y: clamp(fullBounds.y, 0, canvas.height - 2),
    width: clamp(fullBounds.width, 1, canvas.width - fullBounds.x),
    height: clamp(fullBounds.height, 1, canvas.height - fullBounds.y),
  };

  return boundsToQuad(clamped);
}
