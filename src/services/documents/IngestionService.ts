import "server-only";

import { resizeImageToMaxEdge } from "@/lib/image/server-canvas";
import {
  getPdfPageCount,
  rasterizePdfPagesWithPdfJs,
} from "@/lib/ocr/pdf-rasterize-server";

/** DPI when rasterizing PDF pages. */
const PDF_RASTER_DPI = 220;

/** Long-edge cap — keeps token usage predictable without losing table detail. */
const MAX_LONG_EDGE_PX = 2_400;

/** JPEG quality for vision API input. */
const JPEG_QUALITY = 82;

export type IngestedPage = {
  /** Zero-based page index in the source document. */
  index: number;
  bytes: Buffer;
  contentType: "image/jpeg";
  /** Debug label, e.g. pdf-page-1 or upload-2. */
  sourceLabel: string;
};

export type IngestionImageFile = {
  bytes: Buffer;
  contentType: string;
  name?: string;
};

export type IngestionInput =
  | { kind: "pdf"; bytes: Buffer }
  | { kind: "images"; files: IngestionImageFile[] };

/**
 * Select PDF page indices for ABE extraction:
 * first 3 pages + last 2 pages (deduplicated, order preserved).
 * Middle pages are typically multilingual boilerplate.
 */
export function selectAbePdfPageIndices(totalPages: number): number[] {
  if (totalPages <= 0) return [];

  const firstCount = Math.min(3, totalPages);
  const first = Array.from({ length: firstCount }, (_, index) => index);

  if (totalPages <= 3) return first;

  const lastStart = Math.max(3, totalPages - 2);
  const last = Array.from(
    { length: totalPages - lastStart },
    (_, offset) => lastStart + offset,
  );

  const seen = new Set<number>();
  const ordered: number[] = [];
  for (const pageIndex of [...first, ...last]) {
    if (seen.has(pageIndex)) continue;
    seen.add(pageIndex);
    ordered.push(pageIndex);
  }
  return ordered;
}

async function normalizeImageToJpeg(
  bytes: Buffer,
  contentType?: string,
): Promise<Buffer> {
  return resizeImageToMaxEdge(
    bytes,
    MAX_LONG_EDGE_PX,
    "jpeg",
    JPEG_QUALITY,
    contentType,
  );
}

async function ingestPdf(bytes: Buffer): Promise<IngestedPage[]> {
  const totalPages = await getPdfPageCount(bytes);
  const indices = selectAbePdfPageIndices(totalPages);
  if (indices.length === 0) return [];

  const maxIndex = Math.max(...indices);
  const rendered = await rasterizePdfPagesWithPdfJs(
    bytes,
    maxIndex + 1,
    PDF_RASTER_DPI,
  );

  const pages: IngestedPage[] = [];
  for (const pageIndex of indices) {
    const png = rendered[pageIndex];
    if (!png) continue;
    const jpeg = await normalizeImageToJpeg(png);
    pages.push({
      index: pageIndex,
      bytes: jpeg,
      contentType: "image/jpeg",
      sourceLabel: `pdf-page-${pageIndex + 1}`,
    });
  }
  return pages;
}

async function ingestImages(files: IngestionImageFile[]): Promise<IngestedPage[]> {
  const pages: IngestedPage[] = [];

  for (let fileIndex = 0; fileIndex < files.length; fileIndex += 1) {
    const file = files[fileIndex]!;
    const jpeg = await normalizeImageToJpeg(file.bytes, file.contentType);
    pages.push({
      index: fileIndex,
      bytes: jpeg,
      contentType: "image/jpeg",
      sourceLabel: file.name?.trim() || `upload-${fileIndex + 1}`,
    });
  }

  return pages;
}

/**
 * Normalize uploads into JPEG page buffers for the vision extractor.
 */
export async function ingestAbeDocument(
  input: IngestionInput,
): Promise<IngestedPage[]> {
  if (input.kind === "pdf") {
    return ingestPdf(input.bytes);
  }

  if (input.files.length === 0) {
    throw new Error("Mindestens eine Datei erforderlich.");
  }

  return ingestImages(input.files);
}
