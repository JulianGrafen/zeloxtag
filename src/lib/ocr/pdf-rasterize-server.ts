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
  });
  const doc = await loadingTask.promise;

  const pageCount = Math.max(1, doc.numPages);
  const limit = Math.min(maxPages, pageCount);
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

/** Page count for ingestion / preprocessing without Sharp/libvips. */
export async function getPdfPageCount(bytes: Buffer): Promise<number> {
  const pdfjs = await loadPdfJs();
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(bytes),
    useSystemFonts: true,
    disableFontFace: true,
    useWorkerFetch: false,
  });
  const doc = await loadingTask.promise;
  const pageCount = Math.max(1, doc.numPages);
  await destroyPdfDocument(doc);
  return pageCount;
}
