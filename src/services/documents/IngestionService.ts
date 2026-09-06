import "server-only";

import { resizeImageToMaxEdge } from "@/lib/image/server-canvas";
import {
  AbePdfPageLimitError,
  extractPdfPageTextsServer,
  findKbaMatchesInPageTexts,
  selectVisionPagesForKbaHits,
} from "@/lib/ocr/abe-pdf-kba-locator";
import { rasterizePdfPageIndicesWithPdfJs } from "@/lib/ocr/pdf-rasterize-server";
import {
  abeUploadSchema,
  ABE_UPLOAD_MAX_PAGES,
} from "@/lib/validations/abeComplianceSchemas";

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

export type AbeIngestionResult = {
  pages: IngestedPage[];
  /** KBA Typzeichen found via cheap PDF text search before vision. */
  textKbaDigits: string | null;
  totalPdfPages?: number;
};

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

async function ingestPdf(bytes: Buffer): Promise<AbeIngestionResult> {
  const { pageTexts, totalPages } = await extractPdfPageTextsServer(bytes);
  const uploadParsed = abeUploadSchema.safeParse({ pageCount: totalPages });
  if (!uploadParsed.success) {
    throw new AbePdfPageLimitError(
      `PDF hat zu viele Seiten (max. ${ABE_UPLOAD_MAX_PAGES}).`,
    );
  }

  const { kbaPageIndices, kbaDigits } = findKbaMatchesInPageTexts(pageTexts);
  const visionIndices = selectVisionPagesForKbaHits(kbaPageIndices, totalPages);
  if (visionIndices.length === 0) {
    return { pages: [], textKbaDigits: kbaDigits, totalPdfPages: totalPages };
  }

  const rendered = await rasterizePdfPageIndicesWithPdfJs(
    bytes,
    visionIndices,
    PDF_RASTER_DPI,
  );

  const pages: IngestedPage[] = [];
  for (const pageIndex of visionIndices) {
    const png = rendered.get(pageIndex);
    if (!png) continue;
    const jpeg = await normalizeImageToJpeg(png);
    pages.push({
      index: pageIndex,
      bytes: jpeg,
      contentType: "image/jpeg",
      sourceLabel: `pdf-page-${pageIndex + 1}`,
    });
  }

  return {
    pages,
    textKbaDigits: kbaDigits,
    totalPdfPages: totalPages,
  };
}

async function ingestImages(
  files: IngestionImageFile[],
): Promise<AbeIngestionResult> {
  const uploadParsed = abeUploadSchema.safeParse({ pageCount: files.length });
  if (!uploadParsed.success) {
    throw new AbePdfPageLimitError(
      `Zu viele Bilder (max. ${ABE_UPLOAD_MAX_PAGES}).`,
    );
  }

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

  return {
    pages,
    textKbaDigits: null,
  };
}

/**
 * Table extraction samples cover + tail pages where Verwendungsbereich tables live.
 */
export function selectAbeTablePdfPageIndices(totalPages: number): number[] {
  if (totalPages <= 0) return [];
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index);
  }
  return [0, 1, 2, totalPages - 2, totalPages - 1];
}

async function ingestPdfForTable(bytes: Buffer): Promise<IngestedPage[]> {
  const { totalPages } = await extractPdfPageTextsServer(bytes);
  const uploadParsed = abeUploadSchema.safeParse({ pageCount: totalPages });
  if (!uploadParsed.success) {
    throw new AbePdfPageLimitError(
      `PDF hat zu viele Seiten (max. ${ABE_UPLOAD_MAX_PAGES}).`,
    );
  }

  const visionIndices = selectAbeTablePdfPageIndices(totalPages);
  const rendered = await rasterizePdfPageIndicesWithPdfJs(
    bytes,
    visionIndices,
    PDF_RASTER_DPI,
  );

  const pages: IngestedPage[] = [];
  for (const pageIndex of visionIndices) {
    const png = rendered.get(pageIndex);
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

/**
 * Normalize uploads for table vision extraction (cover + tail pages on PDFs).
 */
export async function ingestAbeTableDocument(
  input: IngestionInput,
): Promise<IngestedPage[]> {
  if (input.kind === "pdf") {
    return ingestPdfForTable(input.bytes);
  }

  if (input.files.length === 0) {
    throw new Error("Mindestens eine Datei erforderlich.");
  }

  return (await ingestImages(input.files)).pages;
}

/**
 * Normalize uploads into JPEG page buffers for the vision extractor.
 * PDFs: text-search all pages for KBA first, then rasterize at most three pages.
 */
export async function ingestAbeDocument(
  input: IngestionInput,
): Promise<AbeIngestionResult> {
  if (input.kind === "pdf") {
    return ingestPdf(input.bytes);
  }

  if (input.files.length === 0) {
    throw new Error("Mindestens eine Datei erforderlich.");
  }

  return ingestImages(input.files);
}
