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

import sharp from "sharp";

/** DPI used when rasterizing PDF pages for vision-LLM input. */
const RASTER_DPI = 220;

/** Maximum PDF pages to inspect (costs vs. coverage trade-off). */
const MAX_PAGES = 3;

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

/**
 * Render one PDF page to a PNG buffer at the specified DPI.
 */
async function renderPdfPage(pdfBytes: Buffer, pageIndex: number): Promise<Buffer> {
  return sharp(pdfBytes, { density: RASTER_DPI, page: pageIndex })
    .png()
    .toBuffer();
}

/**
 * Normalize an image (any supported MIME) to PNG for consistent LLM input.
 * Shrinks oversized images to max 2400 px on the long edge to stay within
 * OpenAI token limits without sacrificing table readability.
 */
async function normalizeImageToPng(bytes: Buffer): Promise<Buffer> {
  const MAX_LONG_EDGE = 2_400;

  const meta = await sharp(bytes).metadata();
  const longEdge = Math.max(meta.width ?? 0, meta.height ?? 0);

  let pipeline = sharp(bytes);
  if (longEdge > MAX_LONG_EDGE) {
    pipeline = pipeline.resize(
      meta.width! >= meta.height!
        ? { width: MAX_LONG_EDGE }
        : { height: MAX_LONG_EDGE },
    );
  }
  return pipeline.png().toBuffer();
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
    // Image input — normalize and treat as single page.
    const headerPage = await normalizeImageToPng(bytes);
    return { headerPage, defectsPage: null, pageCount: 1 };
  }

  // PDF input — inspect page count.
  const meta = await sharp(bytes, { density: RASTER_DPI }).metadata();
  const pageCount = Math.min(Math.max(1, meta.pages ?? 1), MAX_PAGES);

  const headerPage = await renderPdfPage(bytes, 0);

  if (pageCount === 1) {
    // Single-page PDF — run full extraction on page 1.
    return { headerPage, defectsPage: null, pageCount: 1 };
  }

  // Multi-page — isolate the defects page (conventionally page 2).
  const defectsPage = await renderPdfPage(bytes, 1);
  return { headerPage, defectsPage, pageCount };
}
