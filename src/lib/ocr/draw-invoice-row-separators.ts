import "server-only";

import { createCanvas, loadImage } from "@napi-rs/canvas";

import type { AzureLayoutAnalyzeResult } from "./azure-document-intelligence";
import {
  computeInvoiceRowLeftMarkers,
  computeInvoiceRowSeparatorLines,
  computeInvoiceRowZebraBands,
  resolveAzurePageScale,
  scaleRowLeftMarkers,
  scaleSeparatorLines,
  scaleZebraBands,
  type HorizontalLineSegment,
  type RowLeftMarker,
  type RowZebraBand,
} from "./azure-layout-geometry";
import { isProbablyRasterImage } from "./document-bytes";

const LINE_COLOR = { r: 0, g: 180, b: 255, a: 235 };
const LINE_THICKNESS_PX = 3;

const ZEBRA_COLORS = [
  { r: 255, g: 232, b: 120, a: 58 },
  { r: 150, g: 215, b: 255, a: 52 },
] as const;

type RgbaColor = { r: number; g: number; b: number; a: number };

export type InvoiceRowOverlayResult = {
  bytes: Buffer;
  separatorsDrawn: number;
  zebraBandsDrawn: number;
  rowMarkersDrawn: number;
};

function rgbaCss(color: RgbaColor): string {
  return `rgba(${color.r}, ${color.g}, ${color.b}, ${(color.a / 255).toFixed(3)})`;
}

function drawZebraBandsOnCanvas(
  ctx: ReturnType<ReturnType<typeof createCanvas>["getContext"]>,
  bands: RowZebraBand[],
): void {
  for (const band of bands) {
    const color = ZEBRA_COLORS[band.dataRowIndex % ZEBRA_COLORS.length]!;
    ctx.fillStyle = rgbaCss(color);
    ctx.fillRect(
      band.minX,
      band.minY,
      Math.max(1, band.maxX - band.minX),
      Math.max(1, band.maxY - band.minY),
    );
  }
}

function drawLineOnCanvas(
  ctx: ReturnType<ReturnType<typeof createCanvas>["getContext"]>,
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

  ctx.fillStyle = rgbaCss(LINE_COLOR);
  for (let y = yCenter - half; y <= yCenter + half; y += 1) {
    if (y < 0 || y >= height) continue;
    ctx.fillRect(fromX, y, Math.max(1, toX - fromX + 1), 1);
  }
}

function drawRowMarkersOnCanvas(
  ctx: ReturnType<ReturnType<typeof createCanvas>["getContext"]>,
  height: number,
  markers: RowLeftMarker[],
): void {
  const badgeWidth = 36;
  const badgeHeight = 22;

  ctx.font = "700 12px Arial, Helvetica, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (const marker of markers) {
    const x = Math.max(2, Math.round(marker.anchorX));
    const y = Math.max(
      2,
      Math.min(height - badgeHeight - 2, Math.round(marker.centerY - badgeHeight / 2)),
    );

    ctx.fillStyle = "rgba(255, 107, 0, 0.93)";
    ctx.fillRect(x, y, badgeWidth, badgeHeight);

    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(marker.label, x + badgeWidth / 2, y + badgeHeight / 2 + 1);
  }
}

/**
 * Draw zebra bands, horizontal separators, and left row labels (Z01…) on the page image.
 * Uses Azure layout table cell polygons; returns original bytes when no geometry exists.
 */
export async function drawInvoiceRowSeparatorsOnImage(
  imageBytes: Buffer,
  layout: AzureLayoutAnalyzeResult | null | undefined,
  pageNumber = 1,
): Promise<InvoiceRowOverlayResult> {
  if (!layout || !isProbablyRasterImage(imageBytes)) {
    return {
      bytes: imageBytes,
      separatorsDrawn: 0,
      zebraBandsDrawn: 0,
      rowMarkersDrawn: 0,
    };
  }

  try {
    const base = await loadImage(imageBytes);
    const imageWidth = base.width;
    const imageHeight = base.height;
    if (imageWidth <= 0 || imageHeight <= 0) {
      return {
        bytes: imageBytes,
        separatorsDrawn: 0,
        zebraBandsDrawn: 0,
        rowMarkersDrawn: 0,
      };
    }

    const page = layout.pages.find((entry) => entry.pageNumber === pageNumber);
    const rawLines = computeInvoiceRowSeparatorLines(layout, pageNumber);
    const rawBands = computeInvoiceRowZebraBands(layout, pageNumber);
    const rawMarkers = computeInvoiceRowLeftMarkers(layout, pageNumber);
    if (rawLines.length === 0 && rawBands.length === 0 && rawMarkers.length === 0) {
      return {
        bytes: imageBytes,
        separatorsDrawn: 0,
        zebraBandsDrawn: 0,
        rowMarkersDrawn: 0,
      };
    }

    const { scaleX, scaleY } = resolveAzurePageScale(
      page?.width,
      page?.height,
      imageWidth,
      imageHeight,
    );
    const lines = scaleSeparatorLines(rawLines, scaleX, scaleY);
    const bands = scaleZebraBands(rawBands, scaleX, scaleY);
    const markers = scaleRowLeftMarkers(rawMarkers, scaleX, scaleY);

    const canvas = createCanvas(imageWidth, imageHeight);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(base, 0, 0);

    if (bands.length > 0) {
      drawZebraBandsOnCanvas(ctx, bands);
    }
    for (const line of lines) {
      drawLineOnCanvas(ctx, imageWidth, imageHeight, line);
    }
    if (markers.length > 0) {
      drawRowMarkersOnCanvas(ctx, imageHeight, markers);
    }

    return {
      bytes: canvas.toBuffer("image/png"),
      separatorsDrawn: lines.length,
      zebraBandsDrawn: bands.length,
      rowMarkersDrawn: markers.length,
    };
  } catch (error) {
    console.warn("[draw-invoice-row-separators] skipped overlay", error);
    return {
      bytes: imageBytes,
      separatorsDrawn: 0,
      zebraBandsDrawn: 0,
      rowMarkersDrawn: 0,
    };
  }
}

export function canDrawRowSeparators(bytes: Buffer, contentType: string): boolean {
  return (
    contentType === "image/png" ||
    contentType === "image/jpeg" ||
    contentType === "image/webp" ||
    isProbablyRasterImage(bytes)
  );
}
