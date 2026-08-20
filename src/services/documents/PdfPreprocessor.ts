/**
 * Server-side TÜV document pre-processor.
 *
 * Splits an incoming PDF or image into focused page buffers so each LLM
 * call receives only the section it needs to read — reducing hallucination
 * and keeping token usage within the model's context window.
 *
 * Layout convention for German HU/AU reports:
 *   Page 1 → Dokumentenkopf: Prüforganisation, Datum, KM-Stand, Ergebnis, nächste HU.
 *   Page 2 → (if present) Festgestellte Mängel (Punkt 6) + Prüfgebühren.
 *
 * For images the whole document is treated as a single page.
 */

import { resizeImageToMaxEdge } from "@/lib/image/server-canvas";
import {
  getPdfPageCount,
  rasterizePdfPagesWithPdfJs,
} from "@/lib/ocr/pdf-rasterize-server";

/** DPI used when rasterizing PDF pages for vision-LLM input. */
const RASTER_DPI = 220;

/** Maximum PDF pages to inspect (costs vs. coverage trade-off). */
const MAX_PAGES = 3;

const MAX_LONG_EDGE = 2_400;

export type PreprocessedTuevDocument = {
  /**
   * PNG of page 1 — always present.
   * Contains: Kopf, Prüforganisation, KM-Stand, Ergebnis, nächste HU.
   */
  headerPage: Buffer;
  /**
   * PNG of page 2 (or null for single-page / image input).
   * Contains: Punkt 6 (Mängel-Nachweis).
   */
  defectsPage: Buffer | null;
  /** Total pages in the source document (1 for images). */
  pageCount: number;
};

async function normalizeImageToPng(bytes: Buffer): Promise<Buffer> {
  return resizeImageToMaxEdge(bytes, MAX_LONG_EDGE, "png");
}

/**
 * Pre-process a TÜV document (PDF or image) into header + optional defects pages.
 *
 * Multi-page PDFs are split: page 1 → header, page 2 → defects.
 * Images and single-page PDFs produce a single `headerPage` with `defectsPage: null`
 * (the downstream extractor runs full extraction on that page instead).
 */
export async function preprocessTuevDocument(
  bytes: Buffer,
  contentType: string,
): Promise<PreprocessedTuevDocument> {
  if (contentType !== "application/pdf") {
    const headerPage = await normalizeImageToPng(bytes);
    return { headerPage, defectsPage: null, pageCount: 1 };
  }

  const totalPages = Math.min(await getPdfPageCount(bytes), MAX_PAGES);
  const rendered = await rasterizePdfPagesWithPdfJs(
    bytes,
    Math.min(totalPages, 2),
    RASTER_DPI,
  );
  const headerPage = rendered[0];
  if (!headerPage) {
    throw new Error("PDF page 1 could not be rasterized.");
  }

  if (totalPages === 1) {
    return { headerPage, defectsPage: null, pageCount: 1 };
  }

  const defectsPage = rendered[1] ?? null;
  return { headerPage, defectsPage, pageCount: totalPages };
}
