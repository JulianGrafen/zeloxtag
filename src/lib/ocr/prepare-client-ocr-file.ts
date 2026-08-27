/**
 * Client-side PDF → JPEG before OCR API calls.
 * Avoids server-side pdf.js + @napi-rs/canvas failures on serverless hosts.
 */

import {
  loadPdfDocument,
  rasterizePdfPage,
  yieldToMain,
} from "./pdf-source";

export type PrepareClientOcrOptions = {
  maxPages?: number;
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

/**
 * Rasterize PDF pages to JPEG files for vision OCR. Non-PDF files pass through.
 */
export async function prepareClientOcrFiles(
  file: File,
  options: PrepareClientOcrOptions = {},
): Promise<File[]> {
  if (!isPdfUploadFile(file)) {
    return [file];
  }

  const maxPages = Math.max(1, options.maxPages ?? 4);
  const pdf = await loadPdfDocument(file);
  const limit = Math.min(pdf.numPages, maxPages);
  const baseName = baseNameFromFile(file);
  const files: File[] = [];

  for (let page = 1; page <= limit; page += 1) {
    const raster = await rasterizePdfPage(pdf, page);
    files.push(
      new File([raster.blob], `${baseName}-seite-${page}.jpg`, {
        type: "image/jpeg",
        lastModified: Date.now(),
      }),
    );
    if (page < limit) {
      await yieldToMain();
    }
  }

  if (typeof pdf.destroy === "function") {
    await pdf.destroy();
  }

  return files.length > 0 ? files : [file];
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
  return 4;
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
