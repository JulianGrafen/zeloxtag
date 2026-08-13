import {
  analyzeLayoutWithAzure,
  isAzureDocumentIntelligenceConfigured,
} from "@/lib/ocr/azure-document-intelligence";

import type {
  DocumentParseInput,
  DocumentParseResult,
  IDocumentParser,
} from "@/services/invoice/interfaces";

export class AzureLayoutDocumentParser implements IDocumentParser {
  /**
   * Runs Azure Document Intelligence `prebuilt-layout` (REST API 2024-11-30).
   * Returns Markdown with table structure — no @azure/ai-form-recognizer SDK required.
   */
  async parse(input: DocumentParseInput): Promise<DocumentParseResult> {
    if (!isAzureDocumentIntelligenceConfigured()) {
      throw new Error(
        "Azure Document Intelligence is not configured (DOCUMENTINTELLIGENCE_ENDPOINT + KEY)",
      );
    }

    const result = await analyzeLayoutWithAzure(input.bytes, input.contentType);
    if (!result) {
      throw new Error("Azure prebuilt-layout analysis failed or timed out");
    }

    const markdown = result.content.trim();
    if (markdown.length < 8) {
      throw new Error("Azure Layout returned empty markdown content");
    }

    return {
      markdown,
      pageCount: Math.max(1, result.pages.length),
      tableCount: result.tables.length,
      layout: result,
    };
  }
}
