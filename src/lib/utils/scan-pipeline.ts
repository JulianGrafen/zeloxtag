/**
 * End-to-end client scan pipeline: warp → professional filter → A4 PDF.
 */

import { A4_ASPECT, optimizeDocumentCanvas } from "./image-optimizer";
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
 * Perspective-correct the selected quad, apply scan filters, build A4 PDF.
 */
export async function buildScanFromCorners(
  sourceCanvas: HTMLCanvasElement,
  corners: QuadPoints,
): Promise<ScanPipelineResult> {
  const warped = await warpPerspectiveAsync(sourceCanvas, corners, {
    maxWidth: WARP_MAX_WIDTH_PX,
    forceAspect: A4_ASPECT,
  });

  const optimized = optimizeDocumentCanvas(warped, {
    maxWidth: WARP_MAX_WIDTH_PX,
  });

  const pdf = await convertImageToPdf(optimized.canvas, {
    fileName: `scan-${Date.now()}`,
    marginMm: 6,
  });

  return {
    previewDataUrl: optimized.dataUrl,
    previewBytes: optimized.byteLength,
    pdf,
    width: optimized.width,
    height: optimized.height,
  };
}
