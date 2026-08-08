/**
 * Map the on-screen DIN A4 guide frame to video pixels (object-cover)
 * and build a perspective-corrected A4 PDF from the capture.
 */

import { computeA4CropRect } from "@/lib/ocr/compress-page";
import { loadImageFromFile } from "@/lib/utils/image-loader";
import {
  A4_ASPECT,
  optimizeDocumentCanvas,
} from "@/lib/utils/image-optimizer";
import {
  convertImageToPdf,
  type PdfConversionResult,
} from "@/lib/utils/pdf-converter";
import {
  defaultDocumentCorners,
  type QuadPoints,
  warpPerspectiveAsync,
  WARP_MAX_WIDTH_PX,
} from "@/lib/utils/perspective";
import { buildScanFromCorners } from "@/lib/utils/scan-pipeline";

export type ContainerRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type VideoCropRect = {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
};

/** Prefix for wizard overview PDFs (single-page A4 scan — not a native multi-page upload). */
export const WIZARD_OVERVIEW_PDF_PREFIX = "invoice-overview-";

export function isWizardOverviewScanPdf(file: File): boolean {
  return (
    file.type === "application/pdf" &&
    file.name.toLowerCase().startsWith(WIZARD_OVERVIEW_PDF_PREFIX)
  );
}

/**
 * Map a rectangle in container coordinates to source video pixel crop (CSS object-cover).
 */
export function mapContainerRectToVideoCrop(
  videoWidth: number,
  videoHeight: number,
  container: ContainerRect,
  rect: ContainerRect,
): VideoCropRect {
  const scale = Math.max(
    container.width / videoWidth,
    container.height / videoHeight,
  );
  const displayedW = videoWidth * scale;
  const displayedH = videoHeight * scale;
  const offsetX = (displayedW - container.width) / 2;
  const offsetY = (displayedH - container.height) / 2;

  const relLeft = rect.left - container.left;
  const relTop = rect.top - container.top;

  const sx = Math.max(0, Math.floor((relLeft + offsetX) / scale));
  const sy = Math.max(0, Math.floor((relTop + offsetY) / scale));
  const sw = Math.min(
    videoWidth - sx,
    Math.ceil(rect.width / scale),
  );
  const sh = Math.min(
    videoHeight - sy,
    Math.ceil(rect.height / scale),
  );

  return {
    sx,
    sy,
    sw: Math.max(1, sw),
    sh: Math.max(1, sh),
  };
}

export function cropCanvasRegion(
  source: HTMLCanvasElement,
  crop: VideoCropRect,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = crop.sw;
  canvas.height = crop.sh;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas ist in diesem Browser nicht verfügbar.");
  }
  ctx.drawImage(
    source,
    crop.sx,
    crop.sy,
    crop.sw,
    crop.sh,
    0,
    0,
    crop.sw,
    crop.sh,
  );
  return canvas;
}

async function warpAndBuildA4Pdf(
  source: HTMLCanvasElement,
  corners: QuadPoints,
  fileName: string,
): Promise<PdfConversionResult> {
  const result = await buildScanFromCorners(source, corners);
  const renamed = new File([result.pdf.file], `${fileName}.pdf`, {
    type: "application/pdf",
    lastModified: Date.now(),
  });
  return { ...result.pdf, file: renamed };
}

/**
 * Crop the guide frame from a full camera capture, auto-straighten, output A4 PDF.
 */
export async function buildA4PdfFromGuideCapture(
  fullCapture: HTMLCanvasElement,
  crop: VideoCropRect,
  fileName = `${WIZARD_OVERVIEW_PDF_PREFIX}${Date.now()}`,
): Promise<PdfConversionResult> {
  const cropped = cropCanvasRegion(fullCapture, crop);
  const corners = defaultDocumentCorners(cropped.width, cropped.height, 0.025);
  return warpAndBuildA4Pdf(cropped, corners, fileName.replace(/\.pdf$/i, ""));
}

/**
 * Gallery fallback: center-crop to A4, enhance, build A4 PDF.
 */
export async function buildA4PdfFromPhotoFile(
  file: File,
  fileName = `${WIZARD_OVERVIEW_PDF_PREFIX}${Date.now()}`,
): Promise<File> {
  const image = await loadImageFromFile(file);
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;

  const sourceCanvas = document.createElement("canvas");
  sourceCanvas.width = sourceWidth;
  sourceCanvas.height = sourceHeight;
  const ctx = sourceCanvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas ist in diesem Browser nicht verfügbar.");
  }
  ctx.drawImage(image, 0, 0);

  const crop = computeA4CropRect(sourceWidth, sourceHeight);
  const cropped = cropCanvasRegion(sourceCanvas, {
    sx: crop.sx,
    sy: crop.sy,
    sw: crop.sw,
    sh: crop.sh,
  });

  const corners = defaultDocumentCorners(cropped.width, cropped.height, 0.04);
  const warped = await warpPerspectiveAsync(cropped, corners, {
    maxWidth: WARP_MAX_WIDTH_PX,
    forceAspect: A4_ASPECT,
  });
  const optimized = optimizeDocumentCanvas(warped, {
    maxWidth: WARP_MAX_WIDTH_PX,
  });

  const pdf = await convertImageToPdf(optimized.canvas, {
    fileName: fileName.replace(/\.pdf$/i, ""),
    marginMm: 6,
  });

  return pdf.file;
}
