import "server-only";

/** Lazy-loaded pdf.js + Node canvas for serverless PDF rasterization. */
let pdfJsModulePromise: Promise<typeof import("pdfjs-dist/legacy/build/pdf.mjs")> | null =
  null;

async function loadPdfJs() {
  if (!pdfJsModulePromise) {
    // No worker thread — Vercel/serverless cannot reliably load pdf.worker.mjs.
    pdfJsModulePromise = import("pdfjs-dist/legacy/build/pdf.mjs");
  }
  return pdfJsModulePromise;
}

async function destroyPdfDocument(doc: unknown): Promise<void> {
  const candidate = doc as { destroy?: () => Promise<void> | void };
  if (typeof candidate.destroy === "function") {
    await candidate.destroy();
  }
}

/**
 * Upper bound on pages we will ever rasterize in one request.
 *
 * `/Count` in a PDF is attacker-controlled: a small file can declare hundreds of
 * thousands of pages. Without this cap a single upload pins CPU and memory until
 * the function times out.
 */
export const MAX_RASTERIZE_PAGES = 24;

/**
 * Rasterize specific PDF page indices (zero-based).
 *
 * Preferred over {@link rasterizePdfPagesWithPdfJs} when only a sparse subset is
 * needed (e.g. first three + last two), because rendering a contiguous prefix to
 * reach the final page is what makes large documents expensive.
 */
export async function rasterizePdfPageIndicesWithPdfJs(
  bytes: Buffer,
  pageIndices: number[],
  dpi: number,
): Promise<Map<number, Buffer>> {
  const rendered = new Map<number, Buffer>();
  if (pageIndices.length === 0) return rendered;

  const pdfjs = await loadPdfJs();
  let createCanvas: typeof import("@napi-rs/canvas").createCanvas;
  try {
    ({ createCanvas } = await import("@napi-rs/canvas"));
  } catch (error) {
    console.error("[pdf-rasterize-server] @napi-rs/canvas unavailable", error);
    throw error;
  }

  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(bytes),
    useSystemFonts: true,
    disableFontFace: true,
    useWorkerFetch: false,
    isEvalSupported: false,
    verbosity: 0,
  });
  const doc = await loadingTask.promise;

  const pageCount = Math.max(1, doc.numPages);
  const scale = Math.max(0.5, dpi / 72);
  const targets = Array.from(new Set(pageIndices))
    .filter((index) => index >= 0 && index < pageCount)
    .sort((a, b) => a - b)
    .slice(0, MAX_RASTERIZE_PAGES);

  for (const pageIndex of targets) {
    const page = await doc.getPage(pageIndex + 1);
    const viewport = page.getViewport({ scale });
    const width = Math.max(1, Math.ceil(viewport.width));
    const height = Math.max(1, Math.ceil(viewport.height));

    const canvas = createCanvas(width, height);
    const context = canvas.getContext("2d");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);

    await page.render({
      canvasContext: context as unknown as CanvasRenderingContext2D,
      viewport,
      canvas: canvas as unknown as HTMLCanvasElement,
    }).promise;

    rendered.set(pageIndex, canvas.toBuffer("image/png"));
    if (typeof page.cleanup === "function") {
      page.cleanup();
    }
  }

  await destroyPdfDocument(doc);
  return rendered;
}

/**
 * Rasterize PDF pages with pdf.js + @napi-rs/canvas (works on Vercel without Poppler).
 */
export async function rasterizePdfPagesWithPdfJs(
  bytes: Buffer,
  maxPages: number,
  dpi: number,
): Promise<Buffer[]> {
  const pdfjs = await loadPdfJs();
  let createCanvas: typeof import("@napi-rs/canvas").createCanvas;
  try {
    ({ createCanvas } = await import("@napi-rs/canvas"));
  } catch (error) {
    console.error("[pdf-rasterize-server] @napi-rs/canvas unavailable", error);
    throw error;
  }

  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(bytes),
    useSystemFonts: true,
    disableFontFace: true,
    useWorkerFetch: false,
    isEvalSupported: false,
    verbosity: 0,
  });
  const doc = await loadingTask.promise;

  const pageCount = Math.max(1, doc.numPages);
  const limit = Math.min(maxPages, pageCount, MAX_RASTERIZE_PAGES);
  const scale = Math.max(0.5, dpi / 72);
  const pages: Buffer[] = [];

  for (let pageNumber = 1; pageNumber <= limit; pageNumber += 1) {
    const page = await doc.getPage(pageNumber);
    const viewport = page.getViewport({ scale });
    const width = Math.max(1, Math.ceil(viewport.width));
    const height = Math.max(1, Math.ceil(viewport.height));

    const canvas = createCanvas(width, height);
    const context = canvas.getContext("2d");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);

    await page.render({
      canvasContext: context as unknown as CanvasRenderingContext2D,
      viewport,
      canvas: canvas as unknown as HTMLCanvasElement,
    }).promise;

    pages.push(canvas.toBuffer("image/png"));
    if (typeof page.cleanup === "function") {
      page.cleanup();
    }
  }

  await destroyPdfDocument(doc);
  return pages;
}

/**
 * Page count for ingestion / preprocessing without Sharp/libvips.
 * Clamped to {@link MAX_TRUSTED_PDF_PAGES} — `/Count` is attacker-controlled.
 */
export const MAX_TRUSTED_PDF_PAGES = 512;

export async function getPdfPageCount(bytes: Buffer): Promise<number> {
  const pdfjs = await loadPdfJs();
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(bytes),
    useSystemFonts: true,
    disableFontFace: true,
    useWorkerFetch: false,
    isEvalSupported: false,
    verbosity: 0,
  });
  const doc = await loadingTask.promise;
  const pageCount = Math.min(Math.max(1, doc.numPages), MAX_TRUSTED_PDF_PAGES);
  await destroyPdfDocument(doc);
  return pageCount;
}
