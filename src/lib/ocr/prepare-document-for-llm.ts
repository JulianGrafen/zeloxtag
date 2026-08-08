import "server-only";

import sharp from "sharp";

import {
  buildDocumentUserMessage,
  type DocumentBytesInput,
  type DocumentUserMessagePart,
} from "./llm-document-content";

export type { DocumentBytesInput };

/** ~220 DPI on A4 width — matches TÜV rasterization. */
export const LLM_DOCUMENT_RASTER_DPI = 220;
/** Cap rasterized / uploaded image long edge before LLM. */
export const LLM_IMAGE_MAX_EDGE_PX = 2200;
export const LLM_INVOICE_MAX_PDF_PAGES = 4;

function pngImagePart(png: Buffer): DocumentUserMessagePart {
  return {
    type: "image_url",
    image_url: {
      url: `data:image/png;base64,${png.toString("base64")}`,
      detail: "high",
    },
  };
}

/**
 * Boost contrast + sharpness for small invoice text / table numbers.
 */
export async function enhanceDocumentImageForLlm(bytes: Buffer): Promise<Buffer> {
  return sharp(bytes, { failOn: "none" })
    .rotate()
    .resize({
      width: LLM_IMAGE_MAX_EDGE_PX,
      height: LLM_IMAGE_MAX_EDGE_PX,
      fit: "inside",
      withoutEnlargement: false,
    })
    .grayscale()
    .normalize()
    .sharpen({ sigma: 1.1, m1: 0.5, m2: 2.5 })
    .png({ compressionLevel: 6, adaptiveFiltering: true })
    .toBuffer();
}

export async function rasterizePdfPagesForLlm(
  bytes: Buffer,
  maxPages: number = LLM_INVOICE_MAX_PDF_PAGES,
  dpi: number = LLM_DOCUMENT_RASTER_DPI,
): Promise<Buffer[]> {
  const meta = await sharp(bytes, { density: dpi }).metadata();
  const pageCount = Math.max(1, meta.pages ?? 1);
  const limit = Math.min(maxPages, pageCount);

  const pages: Buffer[] = [];
  for (let page = 0; page < limit; page += 1) {
    const png = await sharp(bytes, { density: dpi, page })
      .png()
      .toBuffer();
    pages.push(await enhanceDocumentImageForLlm(png));
  }
  return pages;
}

export type PrepareDocumentForLlmOptions = {
  maxPdfPages?: number;
};

/**
 * Rasterize PDFs and enhance images before vision LLM parsing.
 */
export async function prepareDocumentImagesForLlm(
  input: DocumentBytesInput,
  options: PrepareDocumentForLlmOptions = {},
): Promise<Buffer[]> {
  if (input.contentType === "application/pdf") {
    return rasterizePdfPagesForLlm(
      input.bytes,
      options.maxPdfPages ?? LLM_INVOICE_MAX_PDF_PAGES,
    );
  }

  return [await enhanceDocumentImageForLlm(input.bytes)];
}

/**
 * High-contrast page images for invoice / receipt vision parsing.
 * Falls back to the legacy PDF/file path when Sharp/poppler is unavailable.
 */
export async function buildPreparedDocumentUserMessage(
  instructionLines: string[],
  input: DocumentBytesInput,
  options: PrepareDocumentForLlmOptions = {},
): Promise<DocumentUserMessagePart[]> {
  const parts: DocumentUserMessagePart[] = instructionLines
    .filter((line) => line.length > 0)
    .map((text) => ({ type: "text" as const, text }));

  try {
    const images = await prepareDocumentImagesForLlm(input, options);
    if (images.length === 0) {
      return buildDocumentUserMessage(instructionLines, input);
    }

    if (images.length > 1) {
      parts.push({
        type: "text",
        text:
          "Kontrastverstärkte Seitenbilder folgen (Seite 1 zuerst). " +
          "Lies Tabellenzeile für Zeile — Bezeichnung und Betrag gehören zur gleichen Zeile.",
      });
    } else {
      parts.push({
        type: "text",
        text:
          "Kontrastverstärktes Dokumentbild folgt. " +
          "Lies kleine Schrift und Tabellenspalten sorgfältig Zeile für Zeile.",
      });
    }

    for (const png of images) {
      parts.push(pngImagePart(png));
    }

    return parts;
  } catch {
    return buildDocumentUserMessage(instructionLines, input);
  }
}

/** Use an already contrast-enhanced PNG/JPEG buffer (no second Sharp pass). */
export function buildEnhancedImageUserMessage(
  instructionLines: string[],
  enhancedPng: Buffer,
): DocumentUserMessagePart[] {
  const parts: DocumentUserMessagePart[] = instructionLines
    .filter((line) => line.length > 0)
    .map((text) => ({ type: "text" as const, text }));

  parts.push({
    type: "text",
    text:
      "Kontrastverstärktes Dokumentbild folgt. " +
      "Lies kleine Schrift und Tabellenspalten sorgfältig Zeile für Zeile.",
  });
  parts.push(pngImagePart(enhancedPng));
  return parts;
}

/** Single-page OCR/LLM input after prepareDocumentImagesForLlm. */
export async function prepareSinglePageOcrInput(
  input: DocumentBytesInput,
): Promise<DocumentBytesInput> {
  const pages = await prepareDocumentImagesForLlm(input, { maxPdfPages: 1 });
  return {
    bytes: pages[0] ?? input.bytes,
    contentType: "image/png",
  };
}
