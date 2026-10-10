"use client";

import { destroyPdfDocument } from "@/lib/ocr/destroy-pdf-document";
import {
  loadPdfDocument,
  rasterizePdfPage,
  yieldToMain,
} from "@/lib/ocr/pdf-source";
import {
  convertImagesToPdf,
  type PdfConversionResult,
  type PdfImageSource,
} from "@/lib/utils/pdf-converter";

import type { DocumentMediaKind } from "./viewable-url";

export async function mergeDocumentWithNewImages(options: {
  previewSrc: string;
  mediaKind: DocumentMediaKind;
  pageCount: number | null | undefined;
  newImageFiles: File[];
}): Promise<PdfConversionResult> {
  if (options.newImageFiles.length === 0) {
    throw new Error("Bitte mindestens ein Bild auswählen.");
  }

  const sources: PdfImageSource[] = [];

  if (options.mediaKind === "image") {
    const response = await fetch(options.previewSrc, {
      credentials: "same-origin",
    });
    if (!response.ok) {
      throw new Error("Vorhandene Datei konnte nicht geladen werden.");
    }
    sources.push(await response.blob());
  } else if (options.mediaKind === "pdf") {
    const response = await fetch(options.previewSrc, {
      credentials: "same-origin",
    });
    if (!response.ok) {
      throw new Error("Vorhandene Datei konnte nicht geladen werden.");
    }
    const blob = await response.blob();
    const pdf = await loadPdfDocument(blob);
    const totalPages = Math.max(1, pdf.numPages);
    const targetPages =
      options.pageCount != null && options.pageCount > 0
        ? Math.min(options.pageCount, totalPages)
        : totalPages;

    for (let pageNumber = 1; pageNumber <= targetPages; pageNumber += 1) {
      const raster = await rasterizePdfPage(pdf, pageNumber);
      sources.push(raster.blob);
      await yieldToMain();
    }

    await destroyPdfDocument(pdf);
  } else {
    throw new Error("Dateityp wird für Anhänge nicht unterstützt.");
  }

  for (const file of options.newImageFiles) {
    sources.push(file);
  }

  return convertImagesToPdf(sources, {
    fileName: "beleg",
    fullBleed: true,
    imageCompression: "SLOW",
  });
}
