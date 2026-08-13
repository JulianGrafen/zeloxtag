import "server-only";

import { resolveAzureLayoutInput } from "@/lib/ocr/prepare-document-for-llm";
import type { DocumentBytesInput } from "@/lib/ocr/prepare-document-for-llm";

import { AzureLayoutDocumentParser } from "@/services/invoice/adapters/AzureLayoutDocumentParser";
import { OpenAIModelEngine } from "@/services/invoice/adapters/OpenAIModelEngine";
import { HYBRID_INVOICE_JSON_SCHEMA } from "@/services/invoice/hybrid-invoice-json-schema";
import { HYBRID_INVOICE_SYSTEM_PROMPT } from "@/services/invoice/hybrid-invoice-system-prompt";
import type {
  IDocumentParser,
  IModelEngine,
} from "@/services/invoice/interfaces";
import { validateAndFixLineItems } from "@/services/invoice/InvoiceMathValidator";
import {
  parseHybridInvoiceLlmResponse,
  type HybridInvoiceLlmResponse,
} from "@/services/invoice/parse-hybrid-invoice-response";
import type { ParsedInvoice } from "@/types/invoice";

export type HybridInvoiceExtractInput = DocumentBytesInput;

export type HybridInvoiceServiceOptions = {
  /** Override LLM deployment (defaults to {@link resolveInvoiceParseModel}). */
  model?: string;
  /** Max markdown chars sent to the LLM (token guard). */
  maxMarkdownChars?: number;
};

export class HybridInvoiceExtractionError extends Error {
  readonly stage: "layout" | "llm" | "parse" | "validation";

  constructor(
    stage: HybridInvoiceExtractionError["stage"],
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "HybridInvoiceExtractionError";
    this.stage = stage;
  }
}

/**
 * Hybrid pipeline: Azure Layout Markdown → text LLM JSON → math validation.
 * No raw image tokens — cheaper and more stable for Pos tables.
 */
export class HybridInvoiceService {
  private readonly maxMarkdownChars: number;

  constructor(
    private readonly documentParser: IDocumentParser,
    private readonly modelEngine: IModelEngine,
    options: HybridInvoiceServiceOptions = {},
  ) {
    this.maxMarkdownChars = options.maxMarkdownChars ?? 28_000;
  }

  async extract(input: HybridInvoiceExtractInput): Promise<ParsedInvoice> {
    const azureInput = resolveAzureLayoutInput(input, input);

    let markdown: string;
    try {
      const layout = await this.documentParser.parse({
        bytes: azureInput.bytes,
        contentType: azureInput.contentType,
      });
      markdown = layout.markdown.slice(0, this.maxMarkdownChars);
      console.info(
        `[HybridInvoiceService] layout OCR: ${layout.pageCount} page(s), ${layout.tableCount} table(s), ${markdown.length} chars`,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Layout OCR failed.";
      console.error("[HybridInvoiceService] layout stage failed", error);
      throw new HybridInvoiceExtractionError("layout", message, { cause: error });
    }

    let llmRaw: HybridInvoiceLlmResponse;
    try {
      llmRaw = await this.modelEngine.parseStructuredJson<HybridInvoiceLlmResponse>(
        {
          systemPrompt: HYBRID_INVOICE_SYSTEM_PROMPT,
          userContent: [
            "Extract structured invoice data from this layout OCR markdown.",
            "Merge wrapped description lines into the row above (no row shifting).",
            "",
            markdown,
          ].join("\n"),
          jsonSchema: HYBRID_INVOICE_JSON_SCHEMA,
        },
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "LLM parse failed.";
      console.error("[HybridInvoiceService] LLM stage failed", error);
      throw new HybridInvoiceExtractionError("llm", message, { cause: error });
    }

    let draft: ParsedInvoice;
    try {
      const parsed = parseHybridInvoiceLlmResponse(llmRaw);
      draft = {
        ...parsed,
        line_items: validateAndFixLineItems(parsed.line_items),
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Response validation failed.";
      console.error("[HybridInvoiceService] parse stage failed", error);
      throw new HybridInvoiceExtractionError("parse", message, { cause: error });
    }

    return draft;
  }
}

/** Production wiring with Azure Layout REST + OpenAI/Foundry text model. */
export function createDefaultHybridInvoiceService(
  options: HybridInvoiceServiceOptions = {},
): HybridInvoiceService {
  return new HybridInvoiceService(
    new AzureLayoutDocumentParser(),
    new OpenAIModelEngine(options.model),
    options,
  );
}

export const hybridInvoiceService = createDefaultHybridInvoiceService();
