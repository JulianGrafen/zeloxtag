import "server-only";

import sharp from "sharp";

import type { AzureLayoutAnalyzeResult } from "./azure-document-intelligence";
import {
  computeInvoiceRowSeparatorLines,
  computeInvoiceRowZebraBands,
  resolveAzurePageScale,
  scaleSeparatorLines,
  scaleZebraBands,
  type HorizontalLineSegment,
  type RowZebraBand,
} from "./azure-layout-geometry";
import { isPngBuffer, isProbablyRasterImage } from "./document-bytes";

const LINE_COLOR = { r: 0, g: 180, b: 255, a: 235 };
const LINE_THICKNESS_PX = 3;

const ZEBRA_COLORS = [
  { r: 255, g: 232, b: 120, a: 58 },
  { r: 150, g: 215, b: 255, a: 52 },
] as const;

type RgbaColor = { r: number; g: number; b: number; a: number };

function fillRectOnRgba(
  data: Buffer,
  width: number,
  height: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: RgbaColor,
): void {
  const fromX = Math.max(0, Math.min(width - 1, Math.min(x1, x2)));
  const toX = Math.max(0, Math.min(width - 1, Math.max(x1, x2)));
  const fromY = Math.max(0, Math.min(height - 1, Math.min(y1, y2)));
  const toY = Math.max(0, Math.min(height - 1, Math.max(y1, y2)));

  for (let y = fromY; y <= toY; y += 1) {
    for (let x = fromX; x <= toX; x += 1) {
      const index = (y * width + x) * 4;
      data[index] = color.r;
      data[index + 1] = color.g;
      data[index + 2] = color.b;
      data[index + 3] = color.a;
    }
  }
}

function drawLineOnRgba(
  data: Buffer,
  width: number,
  height: number,
  line: HorizontalLineSegment,
): void {
  const yCenter = Math.max(0, Math.min(height - 1, Math.round(line.y)));
  const xStart = Math.max(0, Math.min(width - 1, Math.round(line.x1)));
  const xEnd = Math.max(0, Math.min(width - 1, Math.round(line.x2)));
  const fromX = Math.min(xStart, xEnd);
  const toX = Math.max(xStart, xEnd);
  const half = Math.floor(LINE_THICKNESS_PX / 2);

  for (let y = yCenter - half; y <= yCenter + half; y += 1) {
    if (y < 0 || y >= height) continue;
    for (let x = fromX; x <= toX; x += 1) {
      const index = (y * width + x) * 4;
      data[index] = LINE_COLOR.r;
      data[index + 1] = LINE_COLOR.g;
      data[index + 2] = LINE_COLOR.b;
      data[index + 3] = LINE_COLOR.a;
    }
  }
}

function drawZebraBandsOnRgba(
  data: Buffer,
  width: number,
  height: number,
  bands: RowZebraBand[],
): void {
  for (const band of bands) {
    const color = ZEBRA_COLORS[band.dataRowIndex % ZEBRA_COLORS.length]!;
    fillRectOnRgba(
      data,
      width,
      height,
      band.minX,
      band.minY,
      band.maxX,
      band.maxY,
      color,
    );
  }
}

async function buildRowHighlightOverlayPng(
  width: number,
  height: number,
  bands: RowZebraBand[],
  lines: HorizontalLineSegment[],
): Promise<Buffer | null> {
  if ((bands.length === 0 && lines.length === 0) || width <= 0 || height <= 0) {
    return null;
  }

  const data = Buffer.alloc(width * height * 4, 0);
  if (bands.length > 0) {
    drawZebraBandsOnRgba(data, width, height, bands);
  }
  for (const line of lines) {
    drawLineOnRgba(data, width, height, line);
  }

  return sharp(data, {
    raw: { width, height, channels: 4 },
  })
    .png()
    .toBuffer();
}

/**
 * Draw zebra row bands + horizontal separators on a contrast-enhanced page image for vision LLM.
 * Uses Azure layout table cell polygons; returns original bytes when no geometry exists.
 */
export async function drawInvoiceRowSeparatorsOnImage(
  imageBytes: Buffer,
  layout: AzureLayoutAnalyzeResult | null | undefined,
  pageNumber = 1,
): Promise<{ bytes: Buffer; separatorsDrawn: number; zebraBandsDrawn: number }> {
  if (!layout || !isProbablyRasterImage(imageBytes)) {
    return { bytes: imageBytes, separatorsDrawn: 0, zebraBandsDrawn: 0 };
  }

  try {
    const meta = await sharp(imageBytes, { failOn: "none" }).metadata();
    const imageWidth = meta.width ?? 0;
    const imageHeight = meta.height ?? 0;
    if (imageWidth <= 0 || imageHeight <= 0 || !meta.format) {
      return { bytes: imageBytes, separatorsDrawn: 0, zebraBandsDrawn: 0 };
    }

    const page = layout.pages.find((entry) => entry.pageNumber === pageNumber);
    const rawLines = computeInvoiceRowSeparatorLines(layout, pageNumber);
    const rawBands = computeInvoiceRowZebraBands(layout, pageNumber);
    if (rawLines.length === 0 && rawBands.length === 0) {
      return { bytes: imageBytes, separatorsDrawn: 0, zebraBandsDrawn: 0 };
    }

    const { scaleX, scaleY } = resolveAzurePageScale(
      page?.width,
      page?.height,
      imageWidth,
      imageHeight,
    );
    const lines = scaleSeparatorLines(rawLines, scaleX, scaleY);
    const bands = scaleZebraBands(rawBands, scaleX, scaleY);
    const overlay = await buildRowHighlightOverlayPng(
      imageWidth,
      imageHeight,
      bands,
      lines,
    );
    if (!overlay) {
      return { bytes: imageBytes, separatorsDrawn: 0, zebraBandsDrawn: 0 };
    }

    const bytes = await sharp(imageBytes, { failOn: "none" })
      .composite([{ input: overlay, top: 0, left: 0 }])
      .png({ compressionLevel: 6, adaptiveFiltering: true })
      .toBuffer();

    return {
      bytes,
      separatorsDrawn: lines.length,
      zebraBandsDrawn: bands.length,
    };
  } catch (error) {
    console.warn("[draw-invoice-row-separators] skipped overlay", error);
    return { bytes: imageBytes, separatorsDrawn: 0, zebraBandsDrawn: 0 };
  }
}

export function canDrawRowSeparators(bytes: Buffer, contentType: string): boolean {
  return contentType === "image/png" || isPngBuffer(bytes) || isProbablyRasterImage(bytes);
}
