import "server-only";

import { annotateInvoiceTableRows } from "@/lib/ocr/annotate-invoice-table-rows";
import { deduplicateInvoiceItemTable } from "@/lib/ocr/markdown-page-dedup";
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
import {
  reconcileInvoiceTotals,
} from "@/services/invoice/InvoiceMathValidator";
import { reconcileHybridInvoiceLineItems } from "@/services/invoice/reconcile-hybrid-line-items";
import {
  parseHybridInvoiceLlmResponse,
  type HybridInvoiceLlmResponse,
} from "@/services/invoice/parse-hybrid-invoice-response";
import type { ParsedInvoice } from "@/types/invoice";

export type HybridInvoiceExtractInput = DocumentBytesInput;

export type HybridInvoiceExtractResult = {
  invoice: ParsedInvoice;
  markdown: string;
  pageCount: number;
  tableCount: number;
};

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

  async extract(input: HybridInvoiceExtractInput): Promise<HybridInvoiceExtractResult> {
    const azureInput = resolveAzureLayoutInput(input, input);

    let markdown: string;
    let fullMarkdown: string;
    let pageCount = 1;
    let tableCount = 0;
    let layoutResult: Awaited<ReturnType<IDocumentParser["parse"]>>["layout"] | null =
      null;
    try {
      const layout = await this.documentParser.parse({
        bytes: azureInput.bytes,
        contentType: azureInput.contentType,
      });
      pageCount = layout.pageCount;
      tableCount = layout.tableCount;
      layoutResult = layout.layout;
      fullMarkdown = layout.markdown;
      // 1) Drop earlier truncated duplicate item tables (multi-page reprints).
      // 2) Annotate remaining item rows with Z01/Z02… — text equivalent of the
      //    vision zebra/left-marker overlays, so the LLM cannot row-shift.
      const preparedMarkdown = annotateInvoiceTableRows(
        deduplicateInvoiceItemTable(layout.markdown),
      );
      markdown = preparedMarkdown.slice(0, this.maxMarkdownChars);
      console.info(
        `[HybridInvoiceService] layout OCR: ${layout.pageCount} page(s), ${layout.tableCount} table(s), ${markdown.length} chars (Z-row markers applied)`,
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
            "Rows are anchored with Z01, Z02, Z03 … markers in the leftmost column.",
            "Each Znn = exactly ONE line_item — copy Bezeichnung, Menge, E-Preis, Ges. Preis from that same row only.",
            "Never move prices from Znn to Z(n±1). Merge wrapped description lines into the row above.",
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

    try {
      const parsed = parseHybridInvoiceLlmResponse(llmRaw);
      const correctedLineItems = reconcileHybridInvoiceLineItems({
        draftItems: parsed.line_items,
        markdown: fullMarkdown,
        layout: layoutResult,
        grossAmount: parsed.totals.gross_amount,
        netAmount: parsed.totals.net_amount,
      });
      const reconciled = reconcileInvoiceTotals({
        ...parsed,
        line_items: correctedLineItems,
      });

      console.info(
        `[HybridInvoiceService] total reconciliation: positions=${reconciled.reconciliation.line_items_net_sum} net_delta=${reconciled.reconciliation.net_delta} gross_delta=${reconciled.reconciliation.gross_delta} net_ok=${reconciled.reconciliation.net_reconciled}`,
      );

      if (!reconciled.reconciliation.net_reconciled) {
        console.warn(
          "[HybridInvoiceService] Positions-Summe weicht von Nettosumme ab",
          reconciled.reconciliation,
        );
      }

      return {
        invoice: reconciled,
        markdown,
        pageCount,
        tableCount,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Response validation failed.";
      console.error("[HybridInvoiceService] parse stage failed", error);
      throw new HybridInvoiceExtractionError("parse", message, { cause: error });
    }
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
