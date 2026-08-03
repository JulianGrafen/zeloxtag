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

  const dataUrl = await blobToDataUrl(source);
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
export async function convertImagesToPdf(
  sources: PdfImageSource[],
  options: PdfFromImageOptions = {},
): Promise<PdfConversionResult> {
  if (sources.length === 0) {
    throw new Error("Mindestens eine Seite wird für das PDF benötigt.");
  }

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
