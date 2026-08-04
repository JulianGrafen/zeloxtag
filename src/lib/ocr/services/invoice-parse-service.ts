import type OpenAI from "openai";

import { preferAmount, extractAmountFromText } from "@/lib/ocr/amount-from-text";
import { preferInvoiceCategory } from "@/lib/ocr/infer-invoice-category";
import {
  extractInvoiceLineItemsFromText,
  preferInvoiceLineItems,
} from "@/lib/ocr/invoice-line-items-from-text";
import {
  buildInvoiceSystemPrompt,
  INVOICE_USER_PROMPT_LINES,
} from "@/lib/ocr/invoice-parse-prompts";
import { extractJsonObject } from "@/lib/ocr/json-from-llm";
import { getOcrLlmClient } from "@/lib/ocr/llm-client";
import {
  extractMileageKmFromText,
  preferMileageKm,
} from "@/lib/ocr/mileage-from-text";
import { resolveParseModel } from "@/lib/ocr/model-routing";
import { normalizeOcrMarkdown } from "@/lib/ocr/normalize-ocr-markdown";
import type { OcrJsonPayload } from "@/lib/ocr/ocr-types";
import { TextParseError } from "@/lib/ocr/parse-error";
import {
  INVOICE_TEXT_PARSE_JSON_SCHEMA,
  invoiceTextParseSchema,
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

/**
 * Invoice-only LLM parse service.
 * Uses mid-tier model routing + few-shot prompts for mileage / line items.
 * Does not extract ABE fields — use {@link AbeParseService}.
 */
export class InvoiceParseService {
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

    const routedModel = options.model ?? resolveParseModel("invoice");
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
      model = resolveParseModel("invoice");
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
    const lineItems = preferInvoiceLineItems(
      normalized.lineItems,
      heuristicLineItems,
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
    const lineItems = preferInvoiceLineItems(
      parsed.lineItems,
      heuristicLineItems,
    );

    return this.nullAbeFields(
      normalizeTextParseResult({
        ...parsed,
        vendor,
        category,
        summary: parsed.summary,
        amount: preferAmount(parsed.amount, fullText, lineItems),
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
