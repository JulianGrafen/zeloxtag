import "server-only";

import sharp from "sharp";

import {
  isPdfBuffer,
  isProbablyRasterImage,
  resolveDocumentContentType,
} from "./document-bytes";
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
/** ABE vision — slightly below invoice cap to limit token cost. */
export const ABE_LLM_IMAGE_MAX_EDGE_PX = 1600;
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

async function normalizeRasterToPng(
  bytes: Buffer,
  maxEdgePx = LLM_IMAGE_MAX_EDGE_PX,
): Promise<Buffer> {
  return sharp(bytes, { failOn: "none" })
    .rotate()
    .resize({
      width: maxEdgePx,
      height: maxEdgePx,
      fit: "inside",
      withoutEnlargement: false,
    })
    .png({ compressionLevel: 6, adaptiveFiltering: true })
    .toBuffer();
}

/**
 * Boost contrast + sharpness for small invoice text / table numbers.
 */
export async function enhanceDocumentImageForLlm(
  bytes: Buffer,
  maxEdgePx = LLM_IMAGE_MAX_EDGE_PX,
): Promise<Buffer> {
  try {
    return await sharp(bytes, { failOn: "none" })
      .rotate()
      .resize({
        width: maxEdgePx,
        height: maxEdgePx,
        fit: "inside",
        withoutEnlargement: false,
      })
      .grayscale()
      .normalize()
      .sharpen({ sigma: 1.1, m1: 0.5, m2: 2.5 })
      .png({ compressionLevel: 6, adaptiveFiltering: true })
      .toBuffer();
  } catch (error) {
    console.warn("[prepare-document-for-llm] enhanced pass failed, using plain PNG", error);
    return normalizeRasterToPng(bytes, maxEdgePx);
  }
}

export async function rasterizePdfPagesForLlm(
  bytes: Buffer,
  maxPages: number = LLM_INVOICE_MAX_PDF_PAGES,
  dpi: number = LLM_DOCUMENT_RASTER_DPI,
): Promise<Buffer[]> {
  const meta = await sharp(bytes, { density: dpi, failOn: "none" }).metadata();
  const pageCount = Math.max(1, meta.pages ?? 1);
  const limit = Math.min(maxPages, pageCount);

  const pages: Buffer[] = [];
  for (let page = 0; page < limit; page += 1) {
    const png = await sharp(bytes, { density: dpi, page, failOn: "none" })
      .png()
      .toBuffer();
    pages.push(await enhanceDocumentImageForLlm(png));
  }
  return pages;
}

export type PrepareDocumentForLlmOptions = {
  maxPdfPages?: number;
  /** Long-edge cap for rasterized / enhanced images. */
  maxEdgePx?: number;
};

/**
 * Rasterize PDFs and enhance images before vision LLM parsing.
 * Falls back to the original PDF/image bytes when Sharp cannot decode input.
 */
export async function prepareDocumentImagesForLlm(
  input: DocumentBytesInput,
  options: PrepareDocumentForLlmOptions = {},
): Promise<Buffer[]> {
  const contentType = resolveDocumentContentType(input.bytes, input.contentType);
  const maxEdgePx = options.maxEdgePx ?? LLM_IMAGE_MAX_EDGE_PX;

  if (contentType === "application/pdf" || isPdfBuffer(input.bytes)) {
    try {
      return await rasterizePdfPagesForLlm(
        input.bytes,
        options.maxPdfPages ?? LLM_INVOICE_MAX_PDF_PAGES,
      );
    } catch (error) {
      console.warn("[prepare-document-for-llm] PDF rasterize failed", error);
      return [];
    }
  }

  if (!isProbablyRasterImage(input.bytes)) {
    return [];
  }

  try {
    return [await enhanceDocumentImageForLlm(input.bytes, maxEdgePx)];
  } catch (error) {
    console.warn("[prepare-document-for-llm] image enhance failed", error);
    try {
      return [await normalizeRasterToPng(input.bytes, maxEdgePx)];
    } catch (normalizeError) {
      console.warn("[prepare-document-for-llm] image normalize failed", normalizeError);
      return [];
    }
  }
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
  options: { rowSeparators?: boolean } = {},
): DocumentUserMessagePart[] {
  const parts: DocumentUserMessagePart[] = instructionLines
    .filter((line) => line.length > 0)
    .map((text) => ({ type: "text" as const, text }));

  parts.push({
    type: "text",
    text: options.rowSeparators
      ? "Kontrastverstärktes Dokumentbild mit horizontalen Trennlinien pro Tabellenzeile folgt. " +
        "Bezeichnung und Betrag gehören zur gleichen Zeile (zwischen zwei Linien). " +
        "Lies kleine Schrift und Tabellenspalten sorgfältig Zeile für Zeile."
      : "Kontrastverstärktes Dokumentbild folgt. " +
        "Lies kleine Schrift und Tabellenspalten sorgfältig Zeile für Zeile.",
  });
  parts.push(pngImagePart(enhancedPng));
  return parts;
}

/** Build vision user content from prepared OCR input (PNG or PDF fallback). */
export function buildVisionUserMessage(
  instructionLines: string[],
  input: DocumentBytesInput,
  options: { rowSeparators?: boolean } = {},
): DocumentUserMessagePart[] {
  if (input.contentType === "application/pdf" || isPdfBuffer(input.bytes)) {
    return buildDocumentUserMessage(instructionLines, {
      bytes: input.bytes,
      contentType: "application/pdf",
    });
  }

  return buildEnhancedImageUserMessage(instructionLines, input.bytes, options);
}

/** Single-page OCR/LLM input after prepareDocumentImagesForLlm. */
export async function prepareSinglePageOcrInput(
  input: DocumentBytesInput,
  options: PrepareDocumentForLlmOptions = {},
): Promise<DocumentBytesInput> {
  const pages = await prepareDocumentImagesForLlm(input, {
    maxPdfPages: 1,
    ...options,
  });
  if (pages[0]?.byteLength) {
    return {
      bytes: pages[0],
      contentType: "image/png",
    };
  }

  return {
    bytes: input.bytes,
    contentType: resolveDocumentContentType(input.bytes, input.contentType),
  };
}

/** ABE hunt / table vision — contrast-enhanced PNG capped for LLM cost. */
export async function prepareAbeOcrInput(
  input: DocumentBytesInput,
): Promise<DocumentBytesInput> {
  return prepareSinglePageOcrInput(input, {
    maxPdfPages: 1,
    maxEdgePx: ABE_LLM_IMAGE_MAX_EDGE_PX,
  });
}
