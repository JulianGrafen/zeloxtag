/**
 * Client-side perspective (homography) warp for document scans.
 * Pure Canvas / typed arrays — no external CV libraries.
 */

export type Point2D = { x: number; y: number };

/** Document corners in image space: TL → TR → BR → BL. */
export type QuadPoints = [Point2D, Point2D, Point2D, Point2D];

export const WARP_MAX_WIDTH_PX = 1600;

/** Default inset quad (~8%) so handles start near typical paper edges. */
export function defaultDocumentCorners(
  width: number,
  height: number,
  insetRatio = 0.08,
): QuadPoints {
  const ix = width * insetRatio;
  const iy = height * insetRatio;
  return [
    { x: ix, y: iy },
    { x: width - ix, y: iy },
    { x: width - ix, y: height - iy },
    { x: ix, y: height - iy },
  ];
}

function distance(a: Point2D, b: Point2D): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

/**
 * Output size from selected quad, clamped and optionally forced to A4 aspect.
 */
export function computeWarpOutputSize(
  corners: QuadPoints,
  maxWidth = WARP_MAX_WIDTH_PX,
  forceAspect?: number,
): { width: number; height: number } {
  const [tl, tr, br, bl] = corners;
  const widthTop = distance(tl, tr);
  const widthBottom = distance(bl, br);
  const heightLeft = distance(tl, bl);
  const heightRight = distance(tr, br);

  let width = Math.max(1, Math.round((widthTop + widthBottom) / 2));
  let height = Math.max(1, Math.round((heightLeft + heightRight) / 2));

  if (forceAspect && forceAspect > 0) {
    // Prefer width; derive height from aspect (width/height).
    height = Math.max(1, Math.round(width / forceAspect));
  }

  if (width > maxWidth) {
    const scale = maxWidth / width;
    width = maxWidth;
    height = Math.max(1, Math.round(height * scale));
  }

  // Keep memory sane on large phones.
  const maxPixels = 1600 * 2260;
  if (width * height > maxPixels) {
    const scale = Math.sqrt(maxPixels / (width * height));
    width = Math.max(1, Math.round(width * scale));
    height = Math.max(1, Math.round(height * scale));
  }

  return { width, height };
}

/**
 * Solve 8×8 linear system (Gaussian elimination with partial pivoting).
 * `a` is row-major 8×9 augmented matrix [A|b].
 */
function solveLinear8(a: Float64Array): Float64Array {
  const n = 8;
  const m = a;

  for (let col = 0; col < n; col += 1) {
    let pivot = col;
    let max = Math.abs(m[col * 9 + col]);
    for (let row = col + 1; row < n; row += 1) {
      const value = Math.abs(m[row * 9 + col]);
      if (value > max) {
        max = value;
        pivot = row;
      }
    }

    if (max < 1e-12) {
      throw new Error("Perspektive ungültig — Ecken bitte neu setzen.");
    }

    if (pivot !== col) {
      for (let k = 0; k < 9; k += 1) {
        const i = col * 9 + k;
        const j = pivot * 9 + k;
        const tmp = m[i];
        m[i] = m[j];
        m[j] = tmp;
      }
    }

    const diag = m[col * 9 + col];
    for (let k = col; k < 9; k += 1) {
      m[col * 9 + k] /= diag;
    }

    for (let row = 0; row < n; row += 1) {
      if (row === col) continue;
      const factor = m[row * 9 + col];
      if (factor === 0) continue;
      for (let k = col; k < 9; k += 1) {
        m[row * 9 + k] -= factor * m[col * 9 + k];
      }
    }
  }

  const x = new Float64Array(8);
  for (let i = 0; i < n; i += 1) {
    x[i] = m[i * 9 + 8];
  }
  return x;
}

/**
 * Homography H (3×3, row-major) mapping src → dst in homogeneous coords.
 * h33 is fixed to 1.
 */
export function computeHomography(src: QuadPoints, dst: QuadPoints): Float64Array {
  // For each correspondence: 
  // x' = (h00 x + h01 y + h02) / (h20 x + h21 y + 1)
  // y' = (h10 x + h11 y + h12) / (h20 x + h21 y + 1)
  const a = new Float64Array(8 * 9);

  for (let i = 0; i < 4; i += 1) {
    const { x, y } = src[i];
    const { x: u, y: v } = dst[i];
    const r1 = i * 2 * 9;
    const r2 = (i * 2 + 1) * 9;

    a[r1 + 0] = x;
    a[r1 + 1] = y;
    a[r1 + 2] = 1;
    a[r1 + 3] = 0;
    a[r1 + 4] = 0;
    a[r1 + 5] = 0;
    a[r1 + 6] = -u * x;
    a[r1 + 7] = -u * y;
    a[r1 + 8] = u;

    a[r2 + 0] = 0;
    a[r2 + 1] = 0;
    a[r2 + 2] = 0;
    a[r2 + 3] = x;
    a[r2 + 4] = y;
    a[r2 + 5] = 1;
    a[r2 + 6] = -v * x;
    a[r2 + 7] = -v * y;
    a[r2 + 8] = v;
  }

  const h = solveLinear8(a);
  return new Float64Array([
    h[0],
    h[1],
    h[2],
    h[3],
    h[4],
    h[5],
    h[6],
    h[7],
    1,
  ]);
}

/** Invert a general 3×3 matrix (row-major). */
export function invertHomography3x3(h: Float64Array): Float64Array {
  const [
    a, b, c,
    d, e, f,
    g, i, j,
  ] = h;

  const A = e * j - f * i;
  const B = -(d * j - f * g);
  const C = d * i - e * g;
  const D = -(b * j - c * i);
  const E = a * j - c * g;
  const F = -(a * i - b * g);
  const G = b * f - c * e;
  const H = -(a * f - c * d);
  const I = a * e - b * d;

  const det = a * A + b * B + c * C;
  if (Math.abs(det) < 1e-12) {
    throw new Error("Perspektive ungültig — Ecken bitte neu setzen.");
  }

  const invDet = 1 / det;
  return new Float64Array([
    A * invDet,
    D * invDet,
    G * invDet,
    B * invDet,
    E * invDet,
    H * invDet,
    C * invDet,
    F * invDet,
    I * invDet,
  ]);
}

function applyHomography(h: Float64Array, x: number, y: number): Point2D {
  const w = h[6] * x + h[7] * y + h[8];
  if (Math.abs(w) < 1e-12) {
    return { x: 0, y: 0 };
  }
  return {
    x: (h[0] * x + h[1] * y + h[2]) / w,
    y: (h[3] * x + h[4] * y + h[5]) / w,
  };
}

function sampleBilinear(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
): [number, number, number, number] {
  if (x < 0 || y < 0 || x >= width - 1 || y >= height - 1) {
    // Clamp edge sample for slight overshoot.
    const cx = Math.max(0, Math.min(width - 1, x));
    const cy = Math.max(0, Math.min(height - 1, y));
    const ix = Math.floor(cx);
    const iy = Math.floor(cy);
    const idx = (iy * width + ix) * 4;
    return [data[idx], data[idx + 1], data[idx + 2], data[idx + 3]];
  }

  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = x0 + 1;
  const y1 = y0 + 1;
  const fx = x - x0;
  const fy = y - y0;

  const i00 = (y0 * width + x0) * 4;
  const i10 = (y0 * width + x1) * 4;
  const i01 = (y1 * width + x0) * 4;
  const i11 = (y1 * width + x1) * 4;

  const out: [number, number, number, number] = [0, 0, 0, 0];
  for (let c = 0; c < 4; c += 1) {
    const v00 = data[i00 + c];
    const v10 = data[i10 + c];
    const v01 = data[i01 + c];
    const v11 = data[i11 + c];
    const top = v00 + (v10 - v00) * fx;
    const bottom = v01 + (v11 - v01) * fx;
    out[c] = top + (bottom - top) * fy;
  }
  return out;
}

export type WarpPerspectiveOptions = {
  maxWidth?: number;
  /** If set, force output width/height to this aspect (width/height). */
  forceAspect?: number;
};

function prepareWarpSource(
  source: HTMLCanvasElement | HTMLImageElement | ImageBitmap,
): {
  srcWidth: number;
  srcHeight: number;
  srcData: Uint8ClampedArray;
} {
  const srcWidth =
    "naturalWidth" in source
      ? source.naturalWidth || source.width
      : source.width;
  const srcHeight =
    "naturalHeight" in source
      ? source.naturalHeight || source.height
      : source.height;

  if (!srcWidth || !srcHeight) {
    throw new Error("Quellbild hat keine gültige Größe.");
  }

  const srcCanvas = document.createElement("canvas");
  srcCanvas.width = srcWidth;
  srcCanvas.height = srcHeight;
  const srcCtx = srcCanvas.getContext("2d", { willReadFrequently: true });
  if (!srcCtx) {
    throw new Error("Canvas ist in diesem Browser nicht verfügbar.");
  }
  srcCtx.drawImage(source, 0, 0);

  return {
    srcWidth,
    srcHeight,
    srcData: srcCtx.getImageData(0, 0, srcWidth, srcHeight).data,
  };
}

function fillWarpedRows(
  out: Uint8ClampedArray,
  outW: number,
  yStart: number,
  yEnd: number,
  hOutToSrc: Float64Array,
  srcData: Uint8ClampedArray,
  srcWidth: number,
  srcHeight: number,
): void {
  for (let y = yStart; y < yEnd; y += 1) {
    for (let x = 0; x < outW; x += 1) {
      const src = applyHomography(hOutToSrc, x, y);
      const [r, g, b, a] = sampleBilinear(
        srcData,
        srcWidth,
        srcHeight,
        src.x,
        src.y,
      );
      const idx = (y * outW + x) * 4;
      out[idx] = r;
      out[idx + 1] = g;
      out[idx + 2] = b;
      out[idx + 3] = a;
    }
  }
}

/**
 * Flatten the quad into a rectangular canvas via inverse homography sampling.
 */
export function warpPerspective(
  source: HTMLCanvasElement | HTMLImageElement | ImageBitmap,
  corners: QuadPoints,
  options: WarpPerspectiveOptions = {},
): HTMLCanvasElement {
  const { srcWidth, srcHeight, srcData } = prepareWarpSource(source);
  const { width: outW, height: outH } = computeWarpOutputSize(
    corners,
    options.maxWidth ?? WARP_MAX_WIDTH_PX,
    options.forceAspect,
  );

  const dst: QuadPoints = [
    { x: 0, y: 0 },
    { x: outW - 1, y: 0 },
    { x: outW - 1, y: outH - 1 },
    { x: 0, y: outH - 1 },
  ];

  const hOutToSrc = computeHomography(dst, corners);
  const outCanvas = document.createElement("canvas");
  outCanvas.width = outW;
  outCanvas.height = outH;
  const outCtx = outCanvas.getContext("2d", { willReadFrequently: true });
  if (!outCtx) {
    throw new Error("Canvas ist in diesem Browser nicht verfügbar.");
  }

  const outImage = outCtx.createImageData(outW, outH);
  fillWarpedRows(
    outImage.data,
    outW,
    0,
    outH,
    hOutToSrc,
    srcData,
    srcWidth,
    srcHeight,
  );
  outCtx.putImageData(outImage, 0, 0);
  return outCanvas;
}

/**
 * Async warp that yields every few rows so the UI stays responsive on phones.
 */
export async function warpPerspectiveAsync(
  source: HTMLCanvasElement | HTMLImageElement | ImageBitmap,
  corners: QuadPoints,
  options: WarpPerspectiveOptions = {},
): Promise<HTMLCanvasElement> {
  const { srcWidth, srcHeight, srcData } = prepareWarpSource(source);
  const { width: outW, height: outH } = computeWarpOutputSize(
    corners,
    options.maxWidth ?? WARP_MAX_WIDTH_PX,
    options.forceAspect,
  );

  const dst: QuadPoints = [
    { x: 0, y: 0 },
    { x: outW - 1, y: 0 },
    { x: outW - 1, y: outH - 1 },
    { x: 0, y: outH - 1 },
  ];

  const hOutToSrc = computeHomography(dst, corners);
  const outCanvas = document.createElement("canvas");
  outCanvas.width = outW;
  outCanvas.height = outH;
  const outCtx = outCanvas.getContext("2d", { willReadFrequently: true });
  if (!outCtx) {
    throw new Error("Canvas ist in diesem Browser nicht verfügbar.");
  }

  const outImage = outCtx.createImageData(outW, outH);
  const chunk = 24;

  for (let y = 0; y < outH; y += chunk) {
    fillWarpedRows(
      outImage.data,
      outW,
      y,
      Math.min(outH, y + chunk),
      hOutToSrc,
      srcData,
      srcWidth,
      srcHeight,
    );
    await new Promise<void>((resolve) => {
      window.requestAnimationFrame(() => resolve());
    });
  }

  outCtx.putImageData(outImage, 0, 0);
  return outCanvas;
}

/** Clamp corners inside image bounds. */
export function clampQuadToBounds(
  corners: QuadPoints,
  width: number,
  height: number,
): QuadPoints {
  return corners.map((point) => ({
    x: Math.max(0, Math.min(width, point.x)),
    y: Math.max(0, Math.min(height, point.y)),
  })) as QuadPoints;
}
