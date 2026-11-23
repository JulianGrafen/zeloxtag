/**
 * Client-side PDF helpers (single- and multi-page A4 via jsPDF).
 */

import { jsPDF } from "jspdf";

import { A4_ASPECT } from "./image-optimizer";

export type PdfFromImageOptions = {
  /** Output filename without path. */
  fileName?: string;
  /** Margin around the image on the A4 page (mm). Ignored for fullBleed. */
  marginMm?: number;
  /**
   * Full-bleed pages sized to each image (best for OCR).
   * Avoids shrinking content into an A4 frame with margins.
   */
  fullBleed?: boolean;
  /** jsPDF addImage compression. Prefer NONE/SLOW for OCR accuracy. */
  imageCompression?: "NONE" | "FAST" | "MEDIUM" | "SLOW";
  /** Max total bytes of embedded images (default: Vercel-safe upload budget). */
  totalBudgetBytes?: number;
};

export type PdfConversionResult = {
  file: File;
  blob: Blob;
  byteLength: number;
  pageCount: number;
};

export type PdfImageSource = HTMLCanvasElement | string | Blob;

async function sourceToJpegDataUrl(source: PdfImageSource): Promise<{
  dataUrl: string;
  aspect: number;
}> {
  const withSize = await sourceToJpegDataUrlWithSize(source);
  return { dataUrl: withSize.dataUrl, aspect: withSize.aspect };
}

async function sourceToJpegDataUrlWithSize(source: PdfImageSource): Promise<{
  dataUrl: string;
  aspect: number;
  widthPx: number;
  heightPx: number;
}> {
  if (typeof source === "string") {
    const size = await probeDataUrlSize(source).catch(() => ({
      width: 1240,
      height: Math.round(1240 / A4_ASPECT),
    }));
    return {
      dataUrl: source,
      aspect: size.width / Math.max(1, size.height),
      widthPx: size.width,
      heightPx: size.height,
    };
  }

  if (source instanceof HTMLCanvasElement) {
    return {
      dataUrl: source.toDataURL("image/jpeg", 0.92),
      aspect: source.width / Math.max(1, source.height),
      widthPx: source.width,
      heightPx: source.height,
    };
  }

  const dataUrl = await blobToDataUrl(await fitBlobToPdfBudget(source));
  const size = await probeDataUrlSize(dataUrl).catch(() => ({
    width: 1240,
    height: Math.round(1240 / A4_ASPECT),
  }));
  return {
    dataUrl,
    aspect: size.width / Math.max(1, size.height),
    widthPx: size.width,
    heightPx: size.height,
  };
}

function drawImageOnPdfPage(
  pdf: jsPDF,
  dataUrl: string,
  aspect: number,
  marginMm: number,
  imageCompression: "NONE" | "FAST" | "MEDIUM" | "SLOW" = "FAST",
): void {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const contentWidth = pageWidth - marginMm * 2;
  const contentHeight = pageHeight - marginMm * 2;

  let drawWidth = contentWidth;
  let drawHeight = drawWidth / Math.max(0.1, aspect);
  if (drawHeight > contentHeight) {
    drawHeight = contentHeight;
    drawWidth = drawHeight * aspect;
  }

  const x = marginMm + (contentWidth - drawWidth) / 2;
  const y = marginMm + (contentHeight - drawHeight) / 2;

  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, 0, pageWidth, pageHeight, "F");
  pdf.addImage(
    dataUrl,
    "JPEG",
    x,
    y,
    drawWidth,
    drawHeight,
    undefined,
    imageCompression,
  );
}

/**
 * Create a clean single-page A4 PDF from a JPEG/PNG data URL or canvas.
 */
export async function convertImageToPdf(
  source: PdfImageSource,
  options: PdfFromImageOptions = {},
): Promise<PdfConversionResult> {
  return convertImagesToPdf([source], options);
}

/**
 * Combine page images into one multi-page PDF.
 * Use `fullBleed: true` for Document Intelligence (preserves pixel detail).
 */
/**
 * Server Actions on Vercel reject request bodies > 4.5 MB with an HTML error
 * page („An unexpected response was received from the server“). Multi-photo
 * PDFs therefore share one byte budget across all pages.
 */
export const PDF_UPLOAD_BUDGET_BYTES = Math.floor(3.5 * 1024 * 1024);
let activePageBudgetBytes: number | null = null;

async function fitBlobToPdfBudget(blob: Blob): Promise<Blob> {
  const budget = activePageBudgetBytes;
  if (!budget || blob.size <= budget || !blob.type.startsWith("image/")) {
    return blob;
  }
  try {
    const bitmap = await createImageBitmap(blob);
    // Bytes scale ~ with pixel area → shrink edge by sqrt of the ratio.
    let scale = Math.min(1, Math.sqrt(budget / blob.size) * 0.95);
    let quality = 0.82;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) break;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const out = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", quality),
      );
      if (out && out.size <= budget) {
        bitmap.close?.();
        return out;
      }
      scale *= 0.8;
      quality = Math.max(0.6, quality - 0.08);
    }
    bitmap.close?.();
  } catch {
    // Fall through: keep original if the browser can't decode it.
  }
  return blob;
}

export async function convertImagesToPdf(
  sources: PdfImageSource[],
  options: PdfFromImageOptions = {},
): Promise<PdfConversionResult> {
  if (sources.length === 0) {
    throw new Error("Mindestens eine Seite wird für das PDF benötigt.");
  }
  const previousBudget = activePageBudgetBytes;
  activePageBudgetBytes = Math.floor(
    (options.totalBudgetBytes ?? PDF_UPLOAD_BUDGET_BYTES) / sources.length,
  );
  try {
    return await convertImagesToPdfUnbudgeted(sources, options);
  } finally {
    activePageBudgetBytes = previousBudget;
  }
}

async function convertImagesToPdfUnbudgeted(
  sources: PdfImageSource[],
  options: PdfFromImageOptions,
): Promise<PdfConversionResult> {

  const marginMm = options.marginMm ?? 8;
  const fileName = options.fileName?.replace(/\.pdf$/i, "") || "rechnung-scan";
  const fullBleed = options.fullBleed === true;
  const imageCompression = options.imageCompression ?? (fullBleed ? "NONE" : "FAST");

  if (fullBleed) {
    return convertImagesToFullBleedPdf(sources, fileName, imageCompression);
  }

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  for (let index = 0; index < sources.length; index += 1) {
    if (index > 0) {
      pdf.addPage("a4", "portrait");
    }
    const { dataUrl, aspect } = await sourceToJpegDataUrl(sources[index]);
    drawImageOnPdfPage(pdf, dataUrl, aspect, marginMm, imageCompression);
  }

  const blob = pdf.output("blob");
  const file = new File([blob], `${fileName}.pdf`, {
    type: "application/pdf",
    lastModified: Date.now(),
  });

  return {
    file,
    blob,
    byteLength: blob.size,
    pageCount: sources.length,
  };
}

async function convertImagesToFullBleedPdf(
  sources: PdfImageSource[],
  fileName: string,
  imageCompression: "NONE" | "FAST" | "MEDIUM" | "SLOW",
): Promise<PdfConversionResult> {
  let pdf: jsPDF | null = null;

  for (let index = 0; index < sources.length; index += 1) {
    const { dataUrl, widthPx, heightPx } = await sourceToJpegDataUrlWithSize(
      sources[index],
    );
    // Keep page geometry close to image pixels (1pt ≈ 1 CSS px at 72dpi mapping).
    const pageWidth = Math.max(72, widthPx * 0.75);
    const pageHeight = Math.max(72, heightPx * 0.75);
    const orientation = pageWidth >= pageHeight ? "landscape" : "portrait";

    if (!pdf) {
      pdf = new jsPDF({
        orientation,
        unit: "pt",
        format: [pageWidth, pageHeight],
        compress: false,
      });
    } else {
      pdf.addPage([pageWidth, pageHeight], orientation);
    }

    pdf.addImage(
      dataUrl,
      "JPEG",
      0,
      0,
      pageWidth,
      pageHeight,
      undefined,
      imageCompression,
    );
  }

  if (!pdf) {
    throw new Error("Mindestens eine Seite wird für das PDF benötigt.");
  }

  const blob = pdf.output("blob");
  const file = new File([blob], `${fileName}.pdf`, {
    type: "application/pdf",
    lastModified: Date.now(),
  });

  return {
    file,
    blob,
    byteLength: blob.size,
    pageCount: sources.length,
  };
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Datei konnte nicht gelesen werden."));
    };
    reader.onerror = () => reject(new Error("Datei konnte nicht gelesen werden."));
    reader.readAsDataURL(blob);
  });
}

function probeDataUrlSize(
  dataUrl: string,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      resolve({
        width: image.naturalWidth || image.width,
        height: image.naturalHeight || image.height,
      });
    };
    image.onerror = () => reject(new Error("Aspect probe failed."));
    image.src = dataUrl;
  });
}

/** Convenience: optimize-ready canvas/dataUrl → File for FormData upload. */
export async function buildScanPdfFile(
  source: PdfImageSource,
  baseName = "rechnung-scan",
): Promise<File> {
  const { file } = await convertImageToPdf(source, { fileName: baseName });
  return file;
}

/**
 * Render the first page of a PDF to a canvas (client-side, pdf.js).
 */
export async function rasterizePdfFirstPage(
  file: File | Blob,
  maxWidth = 1600,
): Promise<HTMLCanvasElement> {
  if (typeof document === "undefined") {
    throw new Error("PDF-Rasterisierung ist nur im Browser verfügbar.");
  }

  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";

  const bytes = await file.arrayBuffer();
  let pdf;
  try {
    pdf = await pdfjs.getDocument({ data: bytes }).promise;
  } catch (error) {
    const { isPdfJsPasswordError } = await import("@/lib/ocr/pdf-js-document");
    if (!isPdfJsPasswordError(error)) throw error;
    pdf = await pdfjs.getDocument({ data: bytes, password: "" }).promise;
  }
  const page = await pdf.getPage(1);
  const baseViewport = page.getViewport({ scale: 1 });
  const scale = Math.min(2.5, maxWidth / Math.max(1, baseViewport.width));
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(viewport.width));
  canvas.height = Math.max(1, Math.round(viewport.height));
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas ist in diesem Browser nicht verfügbar.");
  }

  await page.render({ canvas, canvasContext: ctx, viewport }).promise;
  return canvas;
}

function canvasToJpegBlob(canvas: HTMLCanvasElement, quality = 0.85): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Seite konnte nicht gerendert werden.")),
      "image/jpeg",
      quality,
    );
  });
}

/**
 * Uploaded PDFs above the Vercel-safe budget (scanned ABEs are often 5–20 MB)
 * would be rejected with a non-JSON 413. Re-render the first pages as JPEGs
 * and rebuild a compact image PDF that fits {@link PDF_UPLOAD_BUDGET_BYTES}.
 * Small PDFs are returned unchanged (keeps the text layer).
 */
export async function shrinkPdfForUpload(
  file: File,
  { maxPages = 16, maxWidth = 1600 }: { maxPages?: number; maxWidth?: number } = {},
): Promise<File> {
  if (file.size <= PDF_UPLOAD_BUDGET_BYTES || typeof document === "undefined") {
    return file;
  }

  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";

  const bytes = await file.arrayBuffer();
  let pdf;
  try {
    pdf = await pdfjs.getDocument({ data: bytes }).promise;
  } catch (error) {
    const { isPdfJsPasswordError } = await import("@/lib/ocr/pdf-js-document");
    if (!isPdfJsPasswordError(error)) throw error;
    pdf = await pdfjs.getDocument({ data: bytes, password: "" }).promise;
  }

  try {
    const pageCount = Math.min(pdf.numPages, maxPages);
    const pages: Blob[] = [];
    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const baseViewport = page.getViewport({ scale: 1 });
      const scale = Math.min(2.5, maxWidth / Math.max(1, baseViewport.width));
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(viewport.width));
      canvas.height = Math.max(1, Math.round(viewport.height));
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas ist in diesem Browser nicht verfügbar.");
      await page.render({ canvas, canvasContext: ctx, viewport }).promise;
      pages.push(await canvasToJpegBlob(canvas));
      canvas.width = 0;
      canvas.height = 0;
      page.cleanup();
    }

    const result = await convertImagesToPdf(pages, {
      fileName: file.name.replace(/\.pdf$/i, "") || "dokument",
      fullBleed: true,
      imageCompression: "MEDIUM",
    });
    return result.file;
  } finally {
    const { destroyPdfDocument } = await import("@/lib/ocr/destroy-pdf-document");
    await destroyPdfDocument(pdf);
  }
}

/** Fetch a public PDF URL and render page 1 to canvas (showcase dyno preview). */
export async function rasterizePdfFirstPageFromUrl(
  url: string,
  maxWidth = 1600,
): Promise<HTMLCanvasElement> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`PDF konnte nicht geladen werden (${response.status}).`);
  }
  const blob = await response.blob();
  return rasterizePdfFirstPage(blob, maxWidth);
}

/**
 * Normalize wizard pages (PDF or image) into sources for multi-page PDF assembly.
 */
export async function normalizePageForPdfMerge(
  file: File,
): Promise<PdfImageSource> {
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    return rasterizePdfFirstPage(file);
  }
  return file;
}
