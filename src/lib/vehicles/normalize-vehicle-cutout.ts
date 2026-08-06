/**
 * Post-process BG-removed PNGs to match catalog cutouts in /public/vehicles:
 * - transparent canvas (no ground shadow)
 * - car facing left
 * - ~3:1 content aspect, padded into a fixed dashboard-friendly frame
 */

import sharp from "sharp";

/** Matches bmw-530d / m3 framing used in the dashboard header. */
export const CUTOUT_CANVAS = {
  width: 800,
  height: 300,
  /** Inner padding as fraction of the shorter canvas side. */
  padRatio: 0.08,
} as const;

const ALPHA_HARD_CUTOFF = 36;
const SHADOW_ALPHA_MAX = 90;
const SHADOW_LUMA_MAX = 48;

export class CutoutNormalizeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CutoutNormalizeError";
  }
}

type Bounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

function luma(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function findOpaqueBounds(
  data: Buffer,
  width: number,
  height: number,
  alphaMin: number,
): Bounds | null {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (data[i + 3] >= alphaMin) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < 0) return null;
  return { minX, minY, maxX, maxY };
}

function hasTransparentBackground(data: Buffer): boolean {
  for (let index = 3; index < data.length; index += 4) {
    if (data[index] < 250) return true;
  }
  return false;
}

/**
 * Soft under-car shadows from removers → fully transparent.
 * Also snap weak fringe alpha to 0 for a catalog-clean edge.
 */
function cleanAlphaAndShadows(
  data: Buffer,
  width: number,
  height: number,
): void {
  const bounds = findOpaqueBounds(data, width, height, ALPHA_HARD_CUTOFF);
  if (!bounds) return;

  const contentH = Math.max(1, bounds.maxY - bounds.minY + 1);
  const shadowBandTop = bounds.minY + Math.floor(contentH * 0.72);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const a = data[i + 3];
      if (a === 0) continue;

      if (a < ALPHA_HARD_CUTOFF) {
        data[i + 3] = 0;
        continue;
      }

      // Drop diffuse ground shadows under the car (dark + semi-transparent).
      if (
        y >= shadowBandTop &&
        a < SHADOW_ALPHA_MAX &&
        luma(data[i], data[i + 1], data[i + 2]) < SHADOW_LUMA_MAX
      ) {
        data[i + 3] = 0;
      }
    }
  }
}

/**
 * Catalog cutouts face left. Prefer flipping when the right side looks like
 * the nose (brighter / more highlight mass in the front third).
 */
function shouldFlipToFaceLeft(
  data: Buffer,
  width: number,
  height: number,
  bounds: Bounds,
): boolean {
  const contentW = bounds.maxX - bounds.minX + 1;
  const contentH = bounds.maxY - bounds.minY + 1;
  if (contentW < 32 || contentH < 16) return false;

  const third = Math.max(1, Math.floor(contentW / 3));
  const sampleTop = bounds.minY + Math.floor(contentH * 0.15);
  const sampleBottom = bounds.minY + Math.floor(contentH * 0.55);

  let leftScore = 0;
  let rightScore = 0;

  for (let y = sampleTop; y < sampleBottom; y++) {
    for (let dx = 0; dx < third; dx++) {
      const lx = bounds.minX + dx;
      const rx = bounds.maxX - dx;
      const li = (y * width + lx) * 4;
      const ri = (y * width + rx) * 4;
      if (data[li + 3] >= ALPHA_HARD_CUTOFF) {
        leftScore += luma(data[li], data[li + 1], data[li + 2]);
      }
      if (data[ri + 3] >= ALPHA_HARD_CUTOFF) {
        rightScore += luma(data[ri], data[ri + 1], data[ri + 2]);
      }
    }
  }

  // Headlights / bright nose usually win; if right is clearly brighter → faces right.
  return rightScore > leftScore * 1.12;
}

function flipHorizontal(
  data: Buffer,
  width: number,
  height: number,
): Buffer {
  const out = Buffer.alloc(data.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const src = (y * width + x) * 4;
      const dst = (y * width + (width - 1 - x)) * 4;
      out[dst] = data[src];
      out[dst + 1] = data[src + 1];
      out[dst + 2] = data[src + 2];
      out[dst + 3] = data[src + 3];
    }
  }
  return out;
}

/**
 * Normalize a transparent vehicle PNG to the ZeloxTag catalog cutout look.
 */
export async function normalizeVehicleCutout(
  pngBytes: Uint8Array | Buffer,
  options: { requireTransparentBackground?: boolean } = {},
): Promise<Buffer> {
  const requireTransparentBackground =
    options.requireTransparentBackground ?? true;
  const input = Buffer.from(pngBytes);

  let pipeline = sharp(input).ensureAlpha().rotate(); // honor EXIF

  // Soft trim of fully transparent margins before pixel cleanup.
  try {
    pipeline = sharp(
      await pipeline
        .trim({ threshold: 8 })
        .png()
        .toBuffer(),
    ).ensureAlpha();
  } catch {
    // trim fails when the image is fully opaque — keep original.
    pipeline = sharp(input).ensureAlpha();
  }

  const { data, info } = await pipeline
    .raw()
    .toBuffer({ resolveWithObject: true });

  if (info.channels < 4) {
    throw new CutoutNormalizeError("Cutout is missing an alpha channel.");
  }

  const pixels = Buffer.from(data);
  if (requireTransparentBackground && !hasTransparentBackground(pixels)) {
    throw new CutoutNormalizeError(
      "Die hochgeladene Datei hat keinen transparenten Hintergrund.",
    );
  }

  // Opaque phone photos: keep all pixels. Cutouts: clean fringe / ground shadow.
  if (requireTransparentBackground) {
    cleanAlphaAndShadows(pixels, info.width, info.height);
  }

  let bounds = findOpaqueBounds(
    pixels,
    info.width,
    info.height,
    requireTransparentBackground ? ALPHA_HARD_CUTOFF : 1,
  );
  if (!bounds) {
    // Last resort for fully-opaque uploads — use the whole frame.
    bounds = {
      minX: 0,
      minY: 0,
      maxX: info.width - 1,
      maxY: info.height - 1,
    };
  }

  let working: Buffer = pixels;
  const width = info.width;
  const height = info.height;

  if (shouldFlipToFaceLeft(working, width, height, bounds)) {
    working = Buffer.from(flipHorizontal(working, width, height));
    bounds = {
      minX: width - 1 - bounds.maxX,
      maxX: width - 1 - bounds.minX,
      minY: bounds.minY,
      maxY: bounds.maxY,
    };
  }

  const cropped = await sharp(working, {
    raw: { width, height, channels: 4 },
  })
    .extract({
      left: bounds.minX,
      top: bounds.minY,
      width: bounds.maxX - bounds.minX + 1,
      height: bounds.maxY - bounds.minY + 1,
    })
    .png()
    .toBuffer();

  const pad = Math.round(
    Math.min(CUTOUT_CANVAS.width, CUTOUT_CANVAS.height) * CUTOUT_CANVAS.padRatio,
  );
  const maxW = CUTOUT_CANVAS.width - pad * 2;
  const maxH = CUTOUT_CANVAS.height - pad * 2;

  const fitted = await sharp(cropped)
    .resize({
      width: maxW,
      height: maxH,
      fit: "inside",
      withoutEnlargement: false,
      kernel: sharp.kernel.lanczos3,
    })
    // Slight studio punch — catalog cutouts read cleaner than phone photos.
    .modulate({ brightness: 1.03, saturation: 1.06 })
    .sharpen({ sigma: 0.6 })
    .png()
    .toBuffer();

  return sharp({
    create: {
      width: CUTOUT_CANVAS.width,
      height: CUTOUT_CANVAS.height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: fitted, gravity: "centre" }])
    .png({ compressionLevel: 9, effort: 8 })
    .toBuffer();
}
