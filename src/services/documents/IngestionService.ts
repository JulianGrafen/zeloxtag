import "server-only";

import sharp from "sharp";

/** DPI when rasterizing PDF pages (sharp/libvips). */
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

async function normalizeImageToJpeg(bytes: Buffer): Promise<Buffer> {
  const meta = await sharp(bytes).metadata();
  const longEdge = Math.max(meta.width ?? 0, meta.height ?? 0);

  let pipeline = sharp(bytes).rotate();
  if (longEdge > MAX_LONG_EDGE_PX) {
    pipeline = pipeline.resize({
      width: meta.width! >= (meta.height ?? 0) ? MAX_LONG_EDGE_PX : undefined,
      height: (meta.height ?? 0) > (meta.width ?? 0) ? MAX_LONG_EDGE_PX : undefined,
      fit: "inside",
      withoutEnlargement: true,
    });
  }

  return pipeline.jpeg({ quality: JPEG_QUALITY, mozjpeg: true }).toBuffer();
}

async function renderPdfPageToJpeg(
  pdfBytes: Buffer,
  pageIndex: number,
): Promise<Buffer> {
  const png = await sharp(pdfBytes, { density: PDF_RASTER_DPI, page: pageIndex })
    .png()
    .toBuffer();
  return normalizeImageToJpeg(png);
}

async function ingestPdf(bytes: Buffer): Promise<IngestedPage[]> {
  const meta = await sharp(bytes, { density: PDF_RASTER_DPI }).metadata();
  const totalPages = Math.max(1, meta.pages ?? 1);
  const indices = selectAbePdfPageIndices(totalPages);

  const pages: IngestedPage[] = [];
  for (const pageIndex of indices) {
    const jpeg = await renderPdfPageToJpeg(bytes, pageIndex);
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
    const jpeg = await normalizeImageToJpeg(file.bytes);
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
