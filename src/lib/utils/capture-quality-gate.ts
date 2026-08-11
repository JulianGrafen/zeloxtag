/**
 * Lightweight client-side capture quality checks before expensive LLM OCR.
 * Laplacian variance ≈ sharpness; mean luminance ≈ exposure.
 */

export type CaptureQualityIssue = "blur" | "dark";

export type CaptureQualityMetrics = {
  sharpness: number;
  meanLuminance: number;
  isSharp: boolean;
  isBrightEnough: boolean;
  isReady: boolean;
  issue?: CaptureQualityIssue;
};

/** Laplacian variance below this → likely motion blur / out of focus. */
export const CAPTURE_SHARPNESS_MIN = 110;

/** Mean grayscale below this → underexposed (engine bay, shadow). */
export const CAPTURE_LUMINANCE_MIN = 52;

export function captureQualityMessage(issue: CaptureQualityIssue): string {
  if (issue === "blur") {
    return "Bitte nochmal — Bild ist unscharf. Handy ruhig halten und erneut auslösen.";
  }
  return "Bitte nochmal — Bild ist zu dunkel. Mehr Licht oder weniger Schatten.";
}

function downsampleCanvas(
  source: HTMLCanvasElement,
  maxEdge = 480,
): HTMLCanvasElement {
  const longEdge = Math.max(source.width, source.height);
  const scale = longEdge <= maxEdge ? 1 : maxEdge / longEdge;
  const width = Math.max(1, Math.round(source.width * scale));
  const height = Math.max(1, Math.round(source.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    throw new Error("Canvas ist in diesem Browser nicht verfügbar.");
  }
  ctx.drawImage(source, 0, 0, width, height);
  return canvas;
}

/** 3×3 Laplacian variance on grayscale pixels (higher = sharper). */
export function laplacianVarianceFromImageData(imageData: ImageData): number {
  const { data, width, height } = imageData;
  const gray = new Float32Array(width * height);

  for (let p = 0, i = 0; p < gray.length; p += 1, i += 4) {
    gray[p] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }

  let sum = 0;
  let sumSq = 0;
  let count = 0;

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const i = y * width + x;
      const lap =
        -4 * gray[i] +
        gray[i - 1] +
        gray[i + 1] +
        gray[i - width] +
        gray[i + width];
      sum += lap;
      sumSq += lap * lap;
      count += 1;
    }
  }

  if (count === 0) return 0;
  const mean = sum / count;
  return sumSq / count - mean * mean;
}

export function meanLuminanceFromImageData(imageData: ImageData): number {
  const { data } = imageData;
  let total = 0;
  const pixels = data.length / 4;
  for (let i = 0; i < data.length; i += 4) {
    total += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }
  return total / pixels;
}

export function evaluateCaptureQuality(
  sharpness: number,
  meanLuminance: number,
  options: {
    sharpnessMin?: number;
    luminanceMin?: number;
  } = {},
): CaptureQualityMetrics {
  const sharpnessMin = options.sharpnessMin ?? CAPTURE_SHARPNESS_MIN;
  const luminanceMin = options.luminanceMin ?? CAPTURE_LUMINANCE_MIN;
  const isSharp = sharpness >= sharpnessMin;
  const isBrightEnough = meanLuminance >= luminanceMin;
  const isReady = isSharp && isBrightEnough;

  let issue: CaptureQualityIssue | undefined;
  if (!isSharp) issue = "blur";
  else if (!isBrightEnough) issue = "dark";

  return {
    sharpness,
    meanLuminance,
    isSharp,
    isBrightEnough,
    isReady,
    issue,
  };
}

/** Analyze a camera frame or capture canvas before upload. */
export function analyzeCaptureQuality(
  source: HTMLCanvasElement,
  sampleMaxEdge = 480,
): CaptureQualityMetrics {
  const sample = downsampleCanvas(source, sampleMaxEdge);
  const ctx = sample.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    return evaluateCaptureQuality(999, 128);
  }

  const imageData = ctx.getImageData(0, 0, sample.width, sample.height);
  const sharpness = laplacianVarianceFromImageData(imageData);
  const meanLuminance = meanLuminanceFromImageData(imageData);
  return evaluateCaptureQuality(sharpness, meanLuminance);
}
