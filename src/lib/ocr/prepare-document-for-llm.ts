import "server-only";

import { resizeImageToMaxEdge } from "@/lib/image/server-canvas";
import { rasterizePdfPagesWithPdfJs } from "@/lib/ocr/pdf-rasterize-server";

import {
  isPdfBuffer,
  isProbablyRasterImage,
  resolveDocumentContentType,
} from "./document-bytes";
import {
  type DocumentBytesInput,
  type DocumentUserMessagePart,
} from "./llm-document-content";
import { TextParseError } from "./parse-error";
import { isHeicMime } from "@/lib/image/convert-heic-to-jpeg";

export type { DocumentBytesInput };

/**
 * Azure Layout reads vector PDFs more reliably than rasterized previews.
 * Keep enhanced PNG/JPEG for vision LLM, send original PDF bytes to Document Intelligence.
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
/** Full ABE PDF uploads (data hunter / multi-page Gutachten). */
export const ABE_HUNT_MAX_PDF_PAGES = 12;
export const LLM_INVOICE_MAX_PDF_PAGES = 4;

function llmImagePart(bytes: Buffer, contentType = "image/png"): DocumentUserMessagePart {
  return {
    type: "image_url",
    image_url: {
      url: `data:${contentType};base64,${bytes.toString("base64")}`,
      detail: "high",
    },
  };
}

export async function enhanceDocumentImageForLlm(
  bytes: Buffer,
  maxEdgePx = LLM_IMAGE_MAX_EDGE_PX,
  mime?: string,
): Promise<Buffer> {
  return normalizeRasterToPng(bytes, maxEdgePx, mime);
}

async function normalizeRasterToPng(
  bytes: Buffer,
  maxEdgePx = LLM_IMAGE_MAX_EDGE_PX,
  mime?: string,
): Promise<Buffer> {
  return resizeImageToMaxEdge(bytes, maxEdgePx, "png", 85, mime);
}

export async function rasterizePdfPagesForLlm(
  bytes: Buffer,
  maxPages: number = LLM_INVOICE_MAX_PDF_PAGES,
  dpi: number = LLM_DOCUMENT_RASTER_DPI,
): Promise<Buffer[]> {
  const rawPages = await rasterizePdfPagesWithPdfJs(bytes, maxPages, dpi);
  const pages: Buffer[] = [];
  for (const png of rawPages) {
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
 * Rasterize PDFs and resize images before vision LLM parsing.
 * Falls back to empty when pdf.js / canvas cannot decode input.
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

  if (!isProbablyRasterImage(input.bytes) && !isHeicMime(contentType)) {
    return [];
  }

  try {
    return [
      await enhanceDocumentImageForLlm(input.bytes, maxEdgePx, contentType),
    ];
  } catch (error) {
    console.warn("[prepare-document-for-llm] image enhance failed", error);
    try {
      return [await normalizeRasterToPng(input.bytes, maxEdgePx, contentType)];
    } catch (normalizeError) {
      console.warn("[prepare-document-for-llm] image normalize failed", normalizeError);
      return [];
    }
  }
}

/**
 * High-contrast page images for invoice / receipt vision parsing.
 * Falls back to the legacy PDF/file path when rasterization is unavailable.
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
      const contentType = resolveDocumentContentType(input.bytes, input.contentType);
      if (contentType === "application/pdf" || isPdfBuffer(input.bytes)) {
        throw new TextParseError(
          "PDF konnte nicht in Seitenbilder umgewandelt werden.",
        );
      }
      throw new TextParseError(
        "Dokumentbild konnte nicht für die Analyse vorbereitet werden.",
      );
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
  } catch (error) {
    if (error instanceof TextParseError) {
      throw error;
    }
    throw new TextParseError(
      "Dokument konnte nicht für die Bildanalyse vorbereitet werden.",
    );
  }
}

/** Use an already contrast-enhanced image buffer (no second resize pass). */
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
  parts.push(llmImagePart(enhancedImage, options.contentType ?? "image/png"));
  return parts;
}

function visionPdfPagePart(png: Buffer): DocumentUserMessagePart {
  return llmImagePart(png);
}

/**
 * Build vision user content from prepared OCR input.
 * PDFs are rasterized to PNG pages — Azure Foundry rejects native PDF `file` parts.
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
      contentType: "image/png",
    };
  }

  return {
    bytes: input.bytes,
    contentType: resolveDocumentContentType(input.bytes, input.contentType),
  };
}

/** ABE hunt / table vision — PNG capped for LLM cost. */
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

type BuildAbeVisionUserMessageOptions = {
  maxPdfPages?: number;
  prepareOptions?: PrepareDocumentForLlmOptions;
};

/**
 * Rasterize PDFs to PNG pages for vision LLM calls.
 * Native PDF `file` parts are rejected by Azure Foundry — never send them raw.
 */
export async function buildAbeVisionUserMessage(
  instructionLines: string[],
  input: DocumentBytesInput,
  options: BuildAbeVisionUserMessageOptions = {},
): Promise<DocumentUserMessagePart[]> {
  const contentType = resolveDocumentContentType(input.bytes, input.contentType);
  const isPdf = contentType === "application/pdf" || isPdfBuffer(input.bytes);
  const maxPdfPages = options.maxPdfPages ?? ABE_HUNT_MAX_PDF_PAGES;

  if (isPdf) {
    return buildVisionUserMessage(
      instructionLines,
      { bytes: input.bytes, contentType: "application/pdf" },
      { maxPdfPages },
    );
  }

  const prepared = await prepareAbeOcrInput(input, options.prepareOptions);
  return buildVisionUserMessage(instructionLines, prepared);
}
