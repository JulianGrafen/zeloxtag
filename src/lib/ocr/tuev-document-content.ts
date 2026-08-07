import type OpenAI from "openai";
import sharp from "sharp";

import type { DocumentBytesInput, DocumentUserMessagePart } from "./llm-document-content";

/** HU/AU reports: critical data on pages 1–2 (Kopf, Punkt 4, Punkt 6). */
export const TUEV_LLM_MAX_PDF_PAGES = 2;
/** Higher DPI → sharper Punkt-6 tables for vision models. */
const TUEV_PDF_RASTER_DPI = 220;

/**
 * Rasterize the first N PDF pages to PNG for high-detail vision input.
 * Falls back to an empty array when Sharp/poppler is unavailable.
 */
export async function rasterizePdfPagesForLlm(
  bytes: Buffer,
  maxPages: number = TUEV_LLM_MAX_PDF_PAGES,
): Promise<Buffer[]> {
  const meta = await sharp(bytes, { density: TUEV_PDF_RASTER_DPI }).metadata();
  const pageCount = Math.max(1, meta.pages ?? 1);
  const limit = Math.min(maxPages, pageCount);

  const pages: Buffer[] = [];
  for (let page = 0; page < limit; page += 1) {
    const png = await sharp(bytes, {
      density: TUEV_PDF_RASTER_DPI,
      page,
    })
      .png()
      .toBuffer();
    pages.push(png);
  }
  return pages;
}

function pngPart(png: Buffer, label: string): DocumentUserMessagePart {
  return {
    type: "image_url",
    image_url: {
      url: `data:image/png;base64,${png.toString("base64")}`,
      detail: "high",
    },
  };
}

/**
 * TÜV-optimized multimodal message: rasterize PDF pages 1–2 at high resolution;
 * single images use `detail: high`.
 */
export async function buildTuevDocumentUserMessage(
  instructionLines: string[],
  input: DocumentBytesInput,
): Promise<DocumentUserMessagePart[]> {
  const parts: DocumentUserMessagePart[] = instructionLines
    .filter((line) => line.length > 0)
    .map((text) => ({ type: "text" as const, text }));

  if (input.contentType === "application/pdf") {
    try {
      const pageImages = await rasterizePdfPagesForLlm(input.bytes);
      if (pageImages.length > 0) {
        parts.push({
          type: "text",
          text:
            "High-resolution page images follow (page 1 first, then page 2 if present). " +
            "Read Kopf, Punkt 4 (KM-Stand), and Punkt 6 (Mängel table) at full zoom — do not skip rows.",
        });
        pageImages.forEach((png, index) => {
          parts.push(pngPart(png, `Seite ${index + 1}`));
        });
        return parts;
      }
    } catch {
      // Poppler/Sharp unavailable — fall back to native PDF file part.
    }
  }

  if (input.contentType === "application/pdf") {
    parts.push({
      type: "file",
      file: {
        filename: "document.pdf",
        file_data: `data:application/pdf;base64,${input.bytes.toString("base64")}`,
      },
    });
    return parts;
  }

  parts.push({
    type: "image_url",
    image_url: {
      url: `data:${input.contentType};base64,${input.bytes.toString("base64")}`,
      detail: "high",
    },
  });
  return parts;
}
