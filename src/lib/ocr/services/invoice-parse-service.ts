import type OpenAI from "openai";

import { preferAmount, extractAmountFromText } from "@/lib/ocr/amount-from-text";
import {
  buildVisionUserMessage,
  prepareSinglePageOcrInput,
  resolveAzureLayoutInput,
  type DocumentBytesInput,
} from "@/lib/ocr/prepare-document-for-llm";
import {
  analyzeLayoutWithAzure,
  buildOcrPayloadFromAzureLayout,
  isAzureDocumentIntelligenceConfigured,
} from "@/lib/ocr/azure-document-intelligence";
import {
  canDrawRowSeparators,
  drawInvoiceRowSeparatorsOnImage,
} from "@/lib/ocr/draw-invoice-row-separators";
import { buildStubOcrPayload } from "@/lib/ocr/llm-document-content";
import { realignShiftedInvoiceLineItems } from "@/lib/ocr/invoice-line-item-alignment";
import { finalizeColumnFormatLineItems } from "@/lib/ocr/invoice-column-pipeline";
import {
  extractInvoiceLineItemsFromAzureLayout,
  mergeLayoutAndLlmLineItems,
} from "@/lib/ocr/invoice-line-items-from-layout";
import {
  extractInvoiceLineItemsFromText,
  preferInvoiceLineItems,
  reconcileLineItemAmountsWithOcrText,
} from "@/lib/ocr/invoice-line-items-from-text";
import { reconcileInvoicePlausibility } from "@/lib/ocr/invoice-plausibility";
import { preferInvoiceCategory } from "@/lib/ocr/infer-invoice-category";
import {
  buildInvoiceSystemPrompt,
  buildTuevCostSystemPrompt,
  INVOICE_USER_PROMPT_LINES,
  TUEV_COST_USER_PROMPT_LINES,
} from "@/lib/ocr/invoice-parse-prompts";
import {
  detectInvoiceTableFormat,
  shouldDrawInvoiceRowSeparators,
  shouldMergeAzureLayout,
  shouldRealignLineItems,
  shouldReconcileWithOcrHeuristics,
} from "@/lib/ocr/invoice-format-routing";
import {
  extractWorkshopInvoiceAmount,
  reconcileWorkshopLineItemsWithOcrText,
  resolveWorkshopLineItems,
} from "@/lib/ocr/invoice-workshop-sections";
import { deduplicateInvoiceItemTable } from "@/lib/ocr/markdown-page-dedup";
import { extractJsonObject } from "@/lib/ocr/json-from-llm";
import { getOcrLlmClient } from "@/lib/ocr/llm-client";
import {
  extractMileageKmFromText,
  preferMileageKm,
} from "@/lib/ocr/mileage-from-text";
import { resolveInvoiceParseModel, resolveParseModel } from "@/lib/ocr/model-routing";
import { buildTuevDocumentUserMessage } from "@/lib/ocr/tuev-document-content";
import { normalizeOcrMarkdown } from "@/lib/ocr/normalize-ocr-markdown";
import type { OcrJsonPayload } from "@/lib/ocr/ocr-types";
import { TextParseError } from "@/lib/ocr/parse-error";
import {
  buildInvoiceTextParseJsonSchema,
  INVOICE_TEXT_PARSE_JSON_SCHEMA,
  invoiceTextParseSchema,
  normalizeLineItemsList,
  normalizeTextParseResult,
  type InvoiceTextParseResult,
} from "@/lib/ocr/text-parse-schema";
import { resolveVendorName } from "@/lib/ocr/vendor-from-text";

/** Higher ceiling — invoice line-item arrays need room. */
const PARSE_MAX_TOKENS = 3_600;
/** Markdown tables are denser; keep enough context for multi-page invoices. */
const MAX_MARKDOWN_CHARS = 28_000;

/**
 * HTML tables → pipe Markdown, then keep structure for the LLM.
 */
function prepareMarkdownForLlm(rawText: string): string {
  return normalizeOcrMarkdown(rawText)
    .replace(/\n{4,}/g, "\n\n\n")
    .slice(0, MAX_MARKDOWN_CHARS);
}

/**
 * analyzeDocument may pass stringified OCR JSON.
 * Prefer nested `text` (+ header lines) so Markdown / newlines survive.
 */
function resolveOcrPlainText(rawText: string): string {
  const trimmed = rawText.trim();
  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as {
        text?: unknown;
        headerLines?: unknown;
      };
      const body = typeof parsed.text === "string" ? parsed.text : "";
      const headers = Array.isArray(parsed.headerLines)
        ? parsed.headerLines
            .filter((line): line is string => typeof line === "string")
            .join("\n")
        : "";
      const combined = `${headers}\n${body}`.trim();
      if (combined.length >= 8) return combined;
    } catch {
      // Not JSON — use raw OCR text.
    }
  }
  return rawText;
}

export type InvoiceParseOptions = {
  /** Override routed model (tests / diagnostics). */
  model?: string;
};

export type InvoiceDocumentParseOptions = InvoiceParseOptions & {
  /** Hint for invoice vs TÜV report routing in the prompt. */
  documentType?: "invoice" | "tuev";
};

export type InvoiceDocumentParseResult = {
  fields: InvoiceTextParseResult;
  ocrJson: OcrJsonPayload;
};

/**
 * Invoice-only LLM parse service.
 * Uses mid-tier model routing + few-shot prompts for mileage / line items.
 * Does not extract ABE fields — use {@link AbeParseService}.
 */
export class InvoiceParseService {
  /**
   * Parse document bytes (PDF/image) via vision LLM.
   */
  async parseFromDocument(
    input: DocumentBytesInput,
    options: InvoiceDocumentParseOptions = {},
  ): Promise<InvoiceDocumentParseResult> {
    const routedModel =
      options.model ??
      (options.documentType === "tuev"
        ? resolveParseModel("tuev")
        : resolveInvoiceParseModel());
    let client: OpenAI;
    let model: string;
    try {
      ({ client, model } = getOcrLlmClient({ model: routedModel }));
    } catch (error) {
      throw new TextParseError(
        error instanceof Error ? error.message : "LLM client is not configured.",
      );
    }

    if (/^zeloxta/i.test(model)) {
      model = resolveInvoiceParseModel();
    }

    const isTuevReport = options.documentType === "tuev";
    const docHint = isTuevReport
      ? "This is a German HU/AU inspection report (TÜV-Bericht)."
      : "This is a German vehicle invoice, workshop receipt, or service bill.";
    const userLines = isTuevReport
      ? TUEV_COST_USER_PROMPT_LINES
      : INVOICE_USER_PROMPT_LINES;

    const prepared = isTuevReport
      ? input
      : await prepareSinglePageOcrInput(input);
    const azureInput = isTuevReport ? input : resolveAzureLayoutInput(input, prepared);

    let azureLayout = null;
    let llmInput = prepared;
    let rowSeparators = false;
    let rowMarkersLeft = false;

    if (!isTuevReport && isAzureDocumentIntelligenceConfigured()) {
      azureLayout = await analyzeLayoutWithAzure(
        azureInput.bytes,
        azureInput.contentType,
      );
    }

    const tableFormat = !isTuevReport
      ? detectInvoiceTableFormat(azureLayout?.content ?? "")
      : ("column" as const);

    if (
      !isTuevReport &&
      canDrawRowSeparators(prepared.bytes, prepared.contentType) &&
      shouldDrawInvoiceRowSeparators(tableFormat)
    ) {
      const drawn = await drawInvoiceRowSeparatorsOnImage(
        prepared.bytes,
        azureLayout,
      );
      llmInput = { bytes: drawn.bytes, contentType: "image/png" };
      rowSeparators = drawn.separatorsDrawn > 0;
      rowMarkersLeft = drawn.rowMarkersDrawn > 0;
    }

    const userContent = isTuevReport
      ? await buildTuevDocumentUserMessage([docHint, ...userLines], prepared)
      : buildVisionUserMessage([docHint, ...userLines], llmInput, {
          rowSeparators,
          rowMarkersLeft,
        });
    const jsonSchema = buildInvoiceTextParseJsonSchema({
      documentType: isTuevReport ? "tuev" : "invoice",
    });
    const systemPrompt = (
      isTuevReport ? buildTuevCostSystemPrompt() : buildInvoiceSystemPrompt()
    ).replace(/OCR-Input ist Markdown/g, "Lies das hochgeladene Dokument");

    let completion: OpenAI.Chat.Completions.ChatCompletion;
    try {
      completion = await client.chat.completions.create({
        model,
        max_completion_tokens: PARSE_MAX_TOKENS,
        response_format: {
          type: "json_schema",
          json_schema: jsonSchema,
        },
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          { role: "user", content: userContent },
        ],
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "LLM request failed.";
      throw new TextParseError(`Invoice parse request failed: ${message}`);
    }

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new TextParseError("Invoice parse returned an empty response.");
    }

    let parsedJson: unknown;
    try {
      parsedJson = extractJsonObject(content);
    } catch {
      throw new TextParseError("Invoice parse returned invalid JSON.");
    }

    const parsed = invoiceTextParseSchema.safeParse(parsedJson);
    if (!parsed.success) {
      throw new TextParseError(
        `Invoice parse payload failed schema validation: ${parsed.error.issues
          .slice(0, 3)
          .map((issue) => issue.message)
          .join("; ")}`,
      );
    }

    const normalized = this.nullAbeFields(normalizeTextParseResult(parsed.data));

    const ocrJson = azureLayout
      ? buildOcrPayloadFromAzureLayout(azureLayout)
      : buildStubOcrPayload(prepared.contentType);

    if (isTuevReport || !azureLayout) {
      return { fields: normalized, ocrJson };
    }

    const isWorkshopFormat = tableFormat === "workshop-sections";
    const azureContent = azureLayout.content;
    // For multi-page PDFs, Azure Layout generates duplicate item tables across
    // pages (page 1 often has truncated Ges.-Preis, page 2 is complete).
    // Use the deduplicated text for reconciliation so OCR search never picks
    // up the shorter, wrong page-1 values.
    const dedupedOcrText = deduplicateInvoiceItemTable(azureContent);

    if (tableFormat === "column") {
      const layoutLineItems = extractInvoiceLineItemsFromAzureLayout(azureLayout);
      const amount =
        preferAmount(normalized.amount, dedupedOcrText, normalized.lineItems) ??
        null;
      const columnResult = finalizeColumnFormatLineItems({
        llmItems: normalized.lineItems,
        layoutItems: layoutLineItems,
        ocrText: dedupedOcrText,
        grossAmount: amount,
      });

      return {
        fields: {
          ...normalized,
          amount: columnResult.amount,
          lineItems: columnResult.lineItems,
          mileageKm: preferMileageKm(normalized.mileageKm, azureLayout.content),
          vendor: resolveVendorName({
            structuredVendor: normalized.vendor,
            logoCandidates:
              azureLayout.pages[0]?.lines
                ?.map((line) => line.content)
                .slice(0, 4) ?? [],
            rawText: azureLayout.content,
          }),
        },
        ocrJson,
      };
    }

    let llmItems = normalized.lineItems;
    if (isWorkshopFormat) {
      llmItems =
        resolveWorkshopLineItems({
          llmItems: normalized.lineItems,
          ocrText: dedupedOcrText,
        }) ?? normalized.lineItems;
    }

    const layoutLineItems = shouldMergeAzureLayout(tableFormat)
      ? extractInvoiceLineItemsFromAzureLayout(azureLayout)
      : null;

    const amount =
      preferAmount(normalized.amount, dedupedOcrText, llmItems) ??
      (isWorkshopFormat ? extractWorkshopInvoiceAmount(dedupedOcrText) : null);

    const merged = shouldMergeAzureLayout(tableFormat)
      ? mergeLayoutAndLlmLineItems(llmItems, layoutLineItems, amount)
      : llmItems;

    const reconciled =
      shouldReconcileWithOcrHeuristics(tableFormat)
        ? isWorkshopFormat
          ? reconcileWorkshopLineItemsWithOcrText(merged, dedupedOcrText)
          : reconcileLineItemAmountsWithOcrText(merged, dedupedOcrText)
        : merged;

    const lineItems = normalizeLineItemsList(
      shouldRealignLineItems(tableFormat)
        ? realignShiftedInvoiceLineItems(reconciled, amount)
        : reconciled,
      60,
    );

    return {
      fields: {
        ...normalized,
        amount,
        lineItems,
        mileageKm: preferMileageKm(normalized.mileageKm, azureLayout.content),
        vendor: resolveVendorName({
          structuredVendor: normalized.vendor,
          logoCandidates:
            azureLayout.pages[0]?.lines
              ?.map((line) => line.content)
              .slice(0, 4) ?? [],
          rawText: azureLayout.content,
        }),
      },
      ocrJson,
    };
  }

  /**
   * Parse OCR Markdown / text into structured invoice fields.
   * Output is Zod-validated before return.
   */
  async parseFromText(
    rawText: string,
    options: InvoiceParseOptions = {},
  ): Promise<InvoiceTextParseResult> {
    const plainText = resolveOcrPlainText(rawText);
    const text = prepareMarkdownForLlm(plainText);
    const heuristicLineItems = extractInvoiceLineItemsFromText(plainText);
    const heuristicMileageKm = extractMileageKmFromText(plainText);
    const heuristicAmount = preferAmount(null, plainText, heuristicLineItems);

    const heuristicOnlyPayload = (): InvoiceTextParseResult =>
      this.nullAbeFields(
        normalizeTextParseResult({
          vendor: null,
          date: null,
          amount: heuristicAmount,
          category: "other",
          summary: null,
          lineItems: heuristicLineItems,
          kbaNumber: null,
          vehicleApprovals: null,
          authority: null,
          conditions: null,
          partCategory: null,
          notes: null,
          manufacturer: null,
          invoiceNumber: null,
          mileageKm: heuristicMileageKm,
        }),
      );

    const hasHeuristicFallback = Boolean(
      heuristicLineItems?.length ||
        heuristicMileageKm ||
        heuristicAmount ||
        extractAmountFromText(plainText),
    );

    if (text.length < 8) {
      throw new TextParseError("OCR text is too short to parse.");
    }

    const routedModel = options.model ?? resolveInvoiceParseModel();
    let client: OpenAI;
    let model: string;
    try {
      ({ client, model } = getOcrLlmClient({ model: routedModel }));
    } catch (error) {
      throw new TextParseError(
        error instanceof Error ? error.message : "LLM client is not configured.",
      );
    }

    // Never send an agent name as the chat model.
    if (/^zeloxta/i.test(model)) {
      model = resolveInvoiceParseModel();
    }

    const systemInstructions = buildInvoiceSystemPrompt();

    let completion: OpenAI.Chat.Completions.ChatCompletion;
    try {
      completion = await client.chat.completions.create({
        model,
        max_completion_tokens: PARSE_MAX_TOKENS,
        response_format: {
          type: "json_schema",
          json_schema: INVOICE_TEXT_PARSE_JSON_SCHEMA,
        },
        messages: [
          { role: "system", content: systemInstructions },
          {
            role: "user",
            content: [...INVOICE_USER_PROMPT_LINES, "", text].join("\n"),
          },
        ],
      });
    } catch (error) {
      if (hasHeuristicFallback) return heuristicOnlyPayload();
      const message =
        error instanceof Error ? error.message : "LLM request failed.";
      throw new TextParseError(`Invoice parse request failed: ${message}`);
    }

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      if (hasHeuristicFallback) return heuristicOnlyPayload();
      throw new TextParseError("Invoice parse returned an empty response.");
    }

    let parsedJson: unknown;
    try {
      parsedJson = extractJsonObject(content);
    } catch {
      if (hasHeuristicFallback) return heuristicOnlyPayload();
      throw new TextParseError("Invoice parse returned invalid JSON.");
    }

    const parsed = invoiceTextParseSchema.safeParse(parsedJson);
    if (!parsed.success) {
      if (hasHeuristicFallback) return heuristicOnlyPayload();
      throw new TextParseError(
        `Invoice parse payload failed schema validation: ${parsed.error.issues
          .slice(0, 3)
          .map((issue) => issue.message)
          .join("; ")}`,
      );
    }

    const normalized = this.nullAbeFields(
      normalizeTextParseResult(parsed.data),
    );
    const lineItems = realignShiftedInvoiceLineItems(
      preferInvoiceLineItems(normalized.lineItems, heuristicLineItems),
      preferAmount(normalized.amount, plainText, normalized.lineItems),
    );

    return {
      ...normalized,
      lineItems,
      amount: preferAmount(normalized.amount, plainText, lineItems),
      mileageKm: preferMileageKm(normalized.mileageKm, plainText),
    };
  }

  /**
   * Post-LLM heuristics for invoices (vendor, category, amount, mileage, lines).
   * Never promotes a document to category=abe — that belongs to AbeParseService.
   */
  mergeWithOcr(
    parsed: InvoiceTextParseResult,
    ocr: OcrJsonPayload,
  ): InvoiceTextParseResult {
    const headerBlob = ocr.headerLines.join("\n");
    const fullText = `${headerBlob}\n${ocr.text}`;

    const categorySeed = `${fullText}\n${parsed.summary ?? ""}\n${parsed.vendor ?? ""}`;
    const category = preferInvoiceCategory(parsed.category, categorySeed);

    const vendor = resolveVendorName({
      structuredVendor: parsed.vendor,
      logoCandidates: ocr.headerLines.slice(0, 4),
      rawText: fullText,
    });

    const heuristicLineItems = extractInvoiceLineItemsFromText(fullText);
    const layoutLineItems =
      ocr.modelId === "azure-prebuilt-layout" && ocr.text
        ? extractInvoiceLineItemsFromText(ocr.text)
        : null;
    const totalAmount = preferAmount(parsed.amount, fullText, parsed.lineItems);
    const mergedLineItems = mergeLayoutAndLlmLineItems(
      preferInvoiceLineItems(parsed.lineItems, heuristicLineItems),
      layoutLineItems,
      totalAmount,
    );
    const plausibility = reconcileInvoicePlausibility({
      lineItems: mergedLineItems,
      amount: totalAmount,
      ocrText: fullText,
      ocrHeuristicItems: heuristicLineItems,
    });
    const lineItems = normalizeLineItemsList(plausibility.lineItems, 60);

    return this.nullAbeFields(
      normalizeTextParseResult({
        ...parsed,
        vendor,
        category,
        summary: parsed.summary,
        amount: preferAmount(plausibility.amount, fullText, lineItems),
        lineItems,
        invoiceNumber: parsed.invoiceNumber,
        mileageKm: preferMileageKm(parsed.mileageKm, fullText),
        notes: parsed.notes,
      }),
    );
  }

  private nullAbeFields(
    fields: InvoiceTextParseResult,
  ): InvoiceTextParseResult {
    return {
      ...fields,
      category: fields.category === "abe" ? "other" : fields.category,
      kbaNumber: null,
      vehicleApprovals: null,
      authority: null,
      conditions: null,
      partCategory: null,
      manufacturer: null,
    };
  }
}

export const invoiceParseService = new InvoiceParseService();
