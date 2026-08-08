/**
 * End-to-end client scan pipeline: warp → resize → A4 PDF (natural colors).
 */

import { A4_ASPECT, resizeDocumentCanvas } from "./image-optimizer";
import { convertImageToPdf, type PdfConversionResult } from "./pdf-converter";
import {
  type QuadPoints,
  warpPerspectiveAsync,
  WARP_MAX_WIDTH_PX,
} from "./perspective";

export type ScanPipelineResult = {
  previewDataUrl: string;
  previewBytes: number;
  pdf: PdfConversionResult;
  width: number;
  height: number;
};

/**
 * Perspective-correct the selected quad, resize, build A4 PDF.
 */
export async function buildScanFromCorners(
  sourceCanvas: HTMLCanvasElement,
  corners: QuadPoints,
): Promise<ScanPipelineResult> {
  const warped = await warpPerspectiveAsync(sourceCanvas, corners, {
    maxWidth: WARP_MAX_WIDTH_PX,
    forceAspect: A4_ASPECT,
  });

  const canvas = resizeDocumentCanvas(warped, WARP_MAX_WIDTH_PX);
  const previewDataUrl = canvas.toDataURL("image/jpeg", 0.88);
  const previewBytes = Math.floor(
    (((previewDataUrl.split(",")[1] ?? "").length * 3) / 4),
  );

  const pdf = await convertImageToPdf(canvas, {
    fileName: `scan-${Date.now()}`,
    marginMm: 6,
  });

  return {
    previewDataUrl,
    previewBytes,
    pdf,
    width: canvas.width,
    height: canvas.height,
  };
}
