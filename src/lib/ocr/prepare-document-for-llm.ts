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
import { TextParseError } from "./parse-error";

export type { DocumentBytesInput };

/**
 * Azure Layout reads vector PDFs more reliably than rasterized previews.
 * Keep enhanced WebP/JPEG for vision LLM, send original PDF bytes to Document Intelligence.
 */
export function resolveAzureLayoutInput(
  original: DocumentBytesInput,
  prepared: DocumentBytesInput,
): DocumentBytesInput {
  if (isPdfBuffer(original.bytes) || original.contentType === "application/pdf") {
    return {
      bytes: original.bytes,
      contentType: resolveDocumentContentType(original.bytes, original.contentType),
    };
  }
  return prepared;
}

/** ~220 DPI on A4 width — matches TÜV rasterization. */
export const LLM_DOCUMENT_RASTER_DPI = 220;
/** Cap rasterized / uploaded image long edge — matches OpenAI Vision tile scaling. */
export const LLM_IMAGE_MAX_EDGE_PX = 1536;
/** ABE vision — same cap as general LLM prep for Vision tile alignment. */
export const ABE_LLM_IMAGE_MAX_EDGE_PX = 1536;
export const LLM_INVOICE_MAX_PDF_PAGES = 4;

function llmImagePart(bytes: Buffer, contentType = "image/webp"): DocumentUserMessagePart {
  return {
    type: "image_url",
    image_url: {
      url: `data:${contentType};base64,${bytes.toString("base64")}`,
      detail: "high",
    },
  };
}

async function normalizeRasterToWebp(
  bytes: Buffer,
  maxEdgePx = LLM_IMAGE_MAX_EDGE_PX,
): Promise<Buffer> {
  return sharp(bytes, { failOn: "none" })
    .rotate()
    .resize({
      width: maxEdgePx,
      height: maxEdgePx,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 85 })
    .toBuffer();
}

/**
 * Boost contrast + sharpness for small invoice text / table numbers.
 */
export async function enhanceDocumentImageForLlm(
  bytes: Buffer,
  maxEdgePx = LLM_IMAGE_MAX_EDGE_PX,
): Promise<Buffer> {
  return await sharp(bytes, { failOn: "none" })
    .rotate()
    .resize({
      width: maxEdgePx,
      height: maxEdgePx,
      fit: "inside",
      withoutEnlargement: true,
    })
    .grayscale()
    .normalize()
    .sharpen({ sigma: 1.1, m1: 0.5, m2: 2.5 })
    .webp({ quality: 85 })
    .toBuffer();
}

async function rasterizePdfPagesWithSharp(
  bytes: Buffer,
  maxPages: number,
  dpi: number,
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

export async function rasterizePdfPagesForLlm(
  bytes: Buffer,
  maxPages: number = LLM_INVOICE_MAX_PDF_PAGES,
  dpi: number = LLM_DOCUMENT_RASTER_DPI,
): Promise<Buffer[]> {
  try {
    return await rasterizePdfPagesWithSharp(bytes, maxPages, dpi);
  } catch (sharpError) {
    console.warn(
      "[prepare-document-for-llm] Sharp PDF rasterize failed, trying pdf.js",
      sharpError,
    );
  }

  try {
    const { rasterizePdfPagesWithPdfJs } = await import("./pdf-rasterize-server");
    const rawPages = await rasterizePdfPagesWithPdfJs(bytes, maxPages, dpi);
    const pages: Buffer[] = [];
    for (const png of rawPages) {
      pages.push(await enhanceDocumentImageForLlm(png));
    }
    return pages;
  } catch (pdfJsError) {
    console.warn("[prepare-document-for-llm] pdf.js PDF rasterize failed", pdfJsError);
    throw pdfJsError;
  }
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
      return [await normalizeRasterToWebp(input.bytes, maxEdgePx)];
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

    for (const image of images) {
      parts.push(llmImagePart(image));
    }

    return parts;
  } catch {
    return buildDocumentUserMessage(instructionLines, input);
  }
}

/** Use an already contrast-enhanced image buffer (no second Sharp pass). */
export function buildEnhancedImageUserMessage(
  instructionLines: string[],
  enhancedImage: Buffer,
  options: {
    rowSeparators?: boolean;
    rowMarkersLeft?: boolean;
    contentType?: string;
  } = {},
): DocumentUserMessagePart[] {
  const parts: DocumentUserMessagePart[] = instructionLines
    .filter((line) => line.length > 0)
    .map((text) => ({ type: "text" as const, text }));

  let imageHint =
    "Kontrastverstärktes Dokumentbild folgt. " +
    "Lies kleine Schrift und Tabellenspalten sorgfältig Zeile für Zeile.";

  if (options.rowMarkersLeft && options.rowSeparators) {
    imageHint =
      "Kontrastverstärktes Dokumentbild mit nummerierten Tabellenzeilen (orange Z01, Z02, … links) " +
      "und horizontalen Trennlinien folgt. " +
      "Jede orange Markierung Znn = genau EINE Position — alle Spalten rechts davon (Bezeichnung, Menge, E-Preis, Ges. Preis) gehören zu Znn. " +
      "Pos-Spalte (1, 2, 3 …) ist NICHT quantity. Lies jede Zeile vollständig von links nach rechts.";
  } else if (options.rowSeparators) {
    imageHint =
      "Kontrastverstärktes Dokumentbild mit horizontalen Trennlinien pro Tabellenzeile folgt. " +
      "Bezeichnung und Betrag gehören zur gleichen Zeile (zwischen zwei Linien). " +
      "Lies kleine Schrift und Tabellenspalten sorgfältig Zeile für Zeile.";
  } else if (options.rowMarkersLeft) {
    imageHint =
      "Kontrastverstärktes Dokumentbild mit nummerierten Tabellenzeilen (orange Z01, Z02, … links) folgt. " +
      "Jede Markierung Znn = genau EINE Position — alle Spalten rechts davon gehören zu Znn.";
  }

  parts.push({ type: "text", text: imageHint });
  parts.push(llmImagePart(enhancedImage, options.contentType ?? "image/webp"));
  return parts;
}

function visionPdfPagePart(webp: Buffer): DocumentUserMessagePart {
  return llmImagePart(webp);
}

/**
 * Build vision user content from prepared OCR input.
 * PDFs are rasterized to contrast-enhanced WebP pages — Azure Foundry and many
 * deployments reject native PDF `file` parts in chat completions.
 */
export async function buildVisionUserMessage(
  instructionLines: string[],
  input: DocumentBytesInput,
  options: {
    rowSeparators?: boolean;
    rowMarkersLeft?: boolean;
    maxPdfPages?: number;
  } = {},
): Promise<DocumentUserMessagePart[]> {
  if (input.contentType === "application/pdf" || isPdfBuffer(input.bytes)) {
    try {
      const pageImages = await rasterizePdfPagesForLlm(
        input.bytes,
        options.maxPdfPages ?? LLM_INVOICE_MAX_PDF_PAGES,
      );
      if (pageImages.length > 0) {
        const parts: DocumentUserMessagePart[] = instructionLines
          .filter((line) => line.length > 0)
          .map((text) => ({ type: "text" as const, text }));

        let imageHint =
          "Kontrastverstärktes Dokumentbild folgt. " +
          "Lies kleine Schrift und Tabellenspalten sorgfältig Zeile für Zeile.";
        if (options.rowMarkersLeft && options.rowSeparators) {
          imageHint =
            "Kontrastverstärktes Dokumentbild mit nummerierten Tabellenzeilen (orange Z01, Z02, … links) " +
            "und horizontalen Trennlinien folgt. " +
            "Jede orange Markierung Znn = genau EINE Position — alle Spalten rechts davon gehören zu Znn.";
        } else if (options.rowSeparators) {
          imageHint =
            "Kontrastverstärktes Dokumentbild mit horizontalen Trennlinien pro Tabellenzeile folgt. " +
            "Bezeichnung und Betrag gehören zur gleichen Zeile.";
        } else if (pageImages.length > 1) {
          imageHint =
            "Kontrastverstärkte Seitenbilder folgen (Seite 1 zuerst). " +
            "Lies Tabellenzeile für Zeile — Bezeichnung und Betrag gehören zur gleichen Zeile.";
        }

        parts.push({ type: "text", text: imageHint });
        for (const pageImage of pageImages) {
          parts.push(visionPdfPagePart(pageImage));
        }
        return parts;
      }
    } catch (error) {
      console.error("[buildVisionUserMessage] PDF rasterize failed", error);
      throw new TextParseError(
        "PDF konnte nicht für die Bildanalyse vorbereitet werden.",
      );
    }

    throw new TextParseError(
      "PDF konnte nicht in Seitenbilder umgewandelt werden.",
    );
  }

  return buildEnhancedImageUserMessage(instructionLines, input.bytes, {
    ...options,
    contentType: input.contentType,
  });
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
      contentType: "image/webp",
    };
  }

  return {
    bytes: input.bytes,
    contentType: resolveDocumentContentType(input.bytes, input.contentType),
  };
}

/** ABE hunt / table vision — contrast-enhanced WebP capped for LLM cost. */
export async function prepareAbeOcrInput(
  input: DocumentBytesInput,
  options: PrepareDocumentForLlmOptions = {},
): Promise<DocumentBytesInput> {
  return prepareSinglePageOcrInput(input, {
    maxPdfPages: 1,
    maxEdgePx: ABE_LLM_IMAGE_MAX_EDGE_PX,
    ...options,
  });
}
