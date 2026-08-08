/**
 * Client-side PDF helpers via pdfjs-dist (text layer + page rasterization).
 */

import type { PDFDocumentProxy } from "pdfjs-dist";

const MIN_EMBEDDED_TEXT_CHARS = 48;
const RENDER_MAX_WIDTH_PX = 2000;

export type PdfPageRaster = {
  pageNumber: number;
  blob: Blob;
  width: number;
  height: number;
};

let workerConfigured = false;

/** Same-origin worker — CSP (`script-src 'self'`) blocks unpkg/CDN. */
const PDFJS_WORKER_SRC = "/pdfjs/pdf.worker.min.mjs";

async function getPdfJs() {
  const pdfjs = await import("pdfjs-dist");
  if (!workerConfigured) {
    pdfjs.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_SRC;
    workerConfigured = true;
  }
  return pdfjs;
}

export async function loadPdfDocument(file: File | Blob): Promise<PDFDocumentProxy> {
  const pdfjs = await getPdfJs();
  const data = new Uint8Array(await file.arrayBuffer());
  const loadingTask = pdfjs.getDocument({ data, useSystemFonts: true });
  return loadingTask.promise;
}

/**
 * Concatenate embedded text layers. Empty/whitespace-only pages contribute "".
 */
export async function extractPdfEmbeddedText(
  pdf: PDFDocumentProxy,
): Promise<string> {
  const chunks: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (pageText) {
      chunks.push(`--- Seite ${pageNumber} ---\n${pageText}`);
    }
    page.cleanup();
  }

  return chunks.join("\n\n").trim();
}

export function hasUsablePdfTextLayer(text: string): boolean {
  const compact = text.replace(/\s+/g, "");
  return compact.length >= MIN_EMBEDDED_TEXT_CHARS;
}

function canvasToJpegBlob(
  canvas: HTMLCanvasElement,
  quality = 0.72,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error("PDF-Seite konnte nicht gerastert werden."));
        else resolve(blob);
      },
      "image/jpeg",
      quality,
    );
  });
}

/**
 * Rasterize a single PDF page to a compressed JPEG blob (sequential use).
 */
export async function rasterizePdfPage(
  pdf: PDFDocumentProxy,
  pageNumber: number,
): Promise<PdfPageRaster> {
  const page = await pdf.getPage(pageNumber);
  const baseViewport = page.getViewport({ scale: 1 });
  const scale = Math.min(2, RENDER_MAX_WIDTH_PX / Math.max(1, baseViewport.width));
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.floor(viewport.width));
  canvas.height = Math.max(1, Math.floor(viewport.height));
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) {
    page.cleanup();
    throw new Error("Canvas ist in diesem Browser nicht verfügbar.");
  }

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  await page.render({
    canvasContext: ctx,
    viewport,
    canvas,
  }).promise;

  const blob = await canvasToJpegBlob(canvas, 0.88);
  const { width, height } = canvas;

  canvas.width = 0;
  canvas.height = 0;
  page.cleanup();

  return { pageNumber, blob, width, height };
}

/** Yield to the event loop so Safari can reclaim memory between pages. */
export function yieldToMain(): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, 0);
  });
}
