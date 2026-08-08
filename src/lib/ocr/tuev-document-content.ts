import type OpenAI from "openai";

import type { DocumentBytesInput, DocumentUserMessagePart } from "./llm-document-content";
import {
  enhanceDocumentImageForLlm,
  LLM_DOCUMENT_RASTER_DPI,
  rasterizePdfPagesForLlm,
} from "./prepare-document-for-llm";

/** HU/AU reports: critical data on pages 1–2 (Kopf, Punkt 4, Punkt 6). */
export const TUEV_LLM_MAX_PDF_PAGES = 2;
/** Higher DPI → sharper Punkt-6 tables for vision models. */
const TUEV_PDF_RASTER_DPI = LLM_DOCUMENT_RASTER_DPI;

export { rasterizePdfPagesForLlm };

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
      const pageImages = await rasterizePdfPagesForLlm(
        input.bytes,
        TUEV_LLM_MAX_PDF_PAGES,
        TUEV_PDF_RASTER_DPI,
      );
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

  parts.push(
    pngPart(
      await enhanceDocumentImageForLlm(input.bytes),
      "Dokument",
    ),
  );
  return parts;
}
