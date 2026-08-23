import "server-only";

import {
  analyzeLayoutWithAzure,
  isAzureDocumentIntelligenceConfigured,
} from "@/lib/ocr/azure-document-intelligence";
import { TextParseError } from "@/lib/ocr/parse-error";

export type AzureMarkdownLayout = {
  markdown: string;
  pageCount: number;
};

/** Whether Azure Document Intelligence can read PDFs as markdown (vector text). */
export function isAzureMarkdownLayoutAvailable(): boolean {
  return isAzureDocumentIntelligenceConfigured();
}

/**
 * Read a PDF or image through Azure prebuilt-layout (markdown output).
 * Prefer this for multi-page Gutachten PDFs — no server-side rasterization required.
 */
export async function extractMarkdownFromAzureLayout(
  bytes: Buffer,
  contentType: string,
): Promise<AzureMarkdownLayout> {
  const layout = await analyzeLayoutWithAzure(bytes, contentType);
  const markdown = layout?.content?.replace(/\r\n/g, "\n").trim() ?? "";

  if (markdown.length < 8) {
    throw new TextParseError(
      "Dokumenttext konnte nicht aus der PDF gelesen werden.",
    );
  }

  return {
    markdown,
    pageCount: Math.max(1, layout?.pages.length ?? 1),
  };
}
