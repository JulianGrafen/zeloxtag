/**
 * Client-side PDF → JPEG before OCR API calls.
 * Avoids server-side pdf.js + @napi-rs/canvas failures on serverless hosts.
 */

import {
  OCR_IMAGE_MAX_EDGE_PX,
} from "@/lib/documents/document-compression";
import { PAGE_COMPRESS_TARGET_BYTES } from "@/lib/ocr/compress-page";
import { destroyPdfDocument } from "@/lib/ocr/destroy-pdf-document";
import { resizeDocumentImage } from "@/lib/utils/image-optimizer";
import {
  loadPdfDocument,
  rasterizePdfPage,
  yieldToMain,
} from "./pdf-source";

/** Matches InvoiceUploader MAX_PAGES — client raster cap for invoice PDFs. */
export const CLIENT_INVOICE_OCR_MAX_PAGES = 12;

export type PrepareClientOcrOptions = {
  maxPages?: number;
  onPageProgress?: (page: number, total: number) => void;
};

export type PrepareClientOcrResult = {
  files: File[];
  pdfPageCount: number;
  rasterizedPages: number;
};

export function isPdfUploadFile(file: File): boolean {
  return (
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf")
  );
}

function baseNameFromFile(file: File): string {
  return file.name.replace(/\.pdf$/i, "") || "dokument";
}

async function compressRasterPageForOcr(
  jpegFile: File,
): Promise<File> {
  const optimized = await resizeDocumentImage(jpegFile, {
    maxWidth: OCR_IMAGE_MAX_EDGE_PX,
    maxBytes: PAGE_COMPRESS_TARGET_BYTES,
  });
  const blob = await new Promise<Blob>((resolve, reject) => {
    optimized.canvas.toBlob(
      (result) => {
        if (!result) {
          reject(new Error("JPEG-Kompression fehlgeschlagen."));
          return;
        }
        resolve(result);
      },
      "image/jpeg",
      0.88,
    );
  });
  optimized.canvas.width = 0;
  optimized.canvas.height = 0;
  return new File([blob], jpegFile.name, {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}

/**
 * Rasterize PDF pages to JPEG files for vision OCR. Non-PDF files pass through.
 */
export async function prepareClientOcrFiles(
  file: File,
  options: PrepareClientOcrOptions = {},
): Promise<File[]> {
  const result = await prepareClientOcrFilesDetailed(file, options);
  return result.files;
}

/**
 * Rasterize PDF pages with metadata (page counts for UI hints).
 */
export async function prepareClientOcrFilesDetailed(
  file: File,
  options: PrepareClientOcrOptions = {},
): Promise<PrepareClientOcrResult> {
  if (!isPdfUploadFile(file)) {
    return { files: [file], pdfPageCount: 1, rasterizedPages: 1 };
  }

  const maxPages = Math.max(1, options.maxPages ?? CLIENT_INVOICE_OCR_MAX_PAGES);
  let pdf;
  try {
    pdf = await loadPdfDocument(file);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "PDF konnte nicht gelesen werden.";
    throw new Error(message, { cause: error });
  }

  const pdfPageCount = Math.max(1, pdf.numPages);
  const limit = Math.min(pdfPageCount, maxPages);
  const baseName = baseNameFromFile(file);
  const files: File[] = [];

  try {
    for (let page = 1; page <= limit; page += 1) {
      options.onPageProgress?.(page, limit);
      try {
        const raster = await rasterizePdfPage(pdf, page);
        const rawPageFile = new File(
          [raster.blob],
          `${baseName}-seite-${page}.jpg`,
          {
            type: "image/jpeg",
            lastModified: Date.now(),
          },
        );
        const compressedPage = await compressRasterPageForOcr(rawPageFile);
        files.push(compressedPage);
      } catch (pageError) {
        console.warn("[prepareClientOcrFiles] page raster failed", page, pageError);
      }
      if (page < limit) {
        await yieldToMain();
      }
    }
  } finally {
    await destroyPdfDocument(pdf);
  }

  if (files.length === 0) {
    throw new Error(
      "PDF konnte nicht in Seitenbilder umgewandelt werden. " +
        "Bitte „Drucken → Als PDF speichern“ oder Fotos der Seiten hochladen.",
    );
  }

  return {
    files,
    pdfPageCount,
    rasterizedPages: files.length,
  };
}

/** First rasterized page — vault thumbnails. */
export async function prepareClientOcrFirstPage(file: File): Promise<File> {
  const pages = await prepareClientOcrFiles(file, { maxPages: 1 });
  return pages[0]!;
}

/** Gutachten-Tresor: cover + page 2 stitched for classify OCR. */
export async function prepareVaultClassifyFile(file: File): Promise<File> {
  if (!isPdfUploadFile(file)) {
    return file;
  }
  const pages = await prepareClientOcrFiles(file, { maxPages: 2 });
  return pages.length > 1 ? stitchClientOcrImages(pages) : pages[0]!;
}

/** Stack page JPEGs vertically (TÜV single-PDF upload). */
export async function stitchClientOcrImages(files: File[]): Promise<File> {
  if (files.length === 0) {
    throw new Error("Keine Seiten zum Zusammenfügen.");
  }
  if (files.length === 1) {
    return files[0]!;
  }

  const bitmaps = await Promise.all(
    files.map((page) => createImageBitmap(page)),
  );

  try {
    const width = Math.max(...bitmaps.map((bitmap) => bitmap.width));
    const height = bitmaps.reduce((sum, bitmap) => sum + bitmap.height, 0);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Canvas nicht verfügbar.");
    }

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    let y = 0;
    for (const bitmap of bitmaps) {
      ctx.drawImage(bitmap, 0, y);
      y += bitmap.height;
    }

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => {
          if (result) resolve(result);
          else reject(new Error("JPEG konnte nicht erzeugt werden."));
        },
        "image/jpeg",
        0.88,
      );
    });

    return new File([blob], "dokument-seiten.jpg", {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } finally {
    for (const bitmap of bitmaps) {
      bitmap.close();
    }
  }
}

/** TÜV full-PDF → one stitched JPEG (pages 1–2). */
export async function prepareTuevSingleOcrFile(file: File): Promise<File> {
  if (!isPdfUploadFile(file)) {
    return file;
  }
  const pages = await prepareClientOcrFiles(file, { maxPages: 2 });
  return stitchClientOcrImages(pages);
}

/** TÜV wizard step — rasterize PDF section before API upload. */
export async function prepareTuevWizardOcrFile(
  file: File,
  step: "overview" | "header" | "defects",
): Promise<File> {
  if (!isPdfUploadFile(file)) {
    return file;
  }
  const maxPages = step === "overview" ? 2 : 1;
  const pages = await prepareClientOcrFiles(file, { maxPages });
  return pages.length > 1 ? stitchClientOcrImages(pages) : pages[0]!;
}

export function resolveClientOcrMaxPages(input: {
  documentType: "invoice" | "abe" | "tuev";
  approvalKind?: string | null;
}): number {
  if (input.documentType === "tuev") return 2;
  if (input.approvalKind === "einzelabnahme") return 12;
  if (
    input.approvalKind === "gutachten" ||
    input.approvalKind === "teilegutachten" ||
    input.approvalKind === "abe"
  ) {
    return 8;
  }
  if (input.documentType === "abe") return 8;
  return CLIENT_INVOICE_OCR_MAX_PAGES;
}

/** Object URL for review UI — PDFs show first page as image. */
export async function createDocumentPreviewUrl(
  file: File,
): Promise<{ url: string; kind: "pdf" | "image"; owned: boolean }> {
  if (!isPdfUploadFile(file)) {
    return { url: URL.createObjectURL(file), kind: "image", owned: true };
  }
  const firstPage = await prepareClientOcrFirstPage(file);
  return { url: URL.createObjectURL(firstPage), kind: "image", owned: true };
}
