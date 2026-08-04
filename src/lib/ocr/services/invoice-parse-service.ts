import type OpenAI from "openai";

import { preferAmount, extractAmountFromText } from "@/lib/ocr/amount-from-text";
import {
  getConfiguredFoundryAgentName,
  loadFoundryAgentDefinition,
} from "@/lib/ocr/foundry-agent";
import {
  extractInvoiceLineItemsFromText,
  preferInvoiceLineItems,
} from "@/lib/ocr/invoice-line-items-from-text";
import {
  INVOICE_SYSTEM_PROMPT,
  INVOICE_USER_PROMPT_LINES,
} from "@/lib/ocr/invoice-parse-prompts";
import { extractJsonObject } from "@/lib/ocr/json-from-llm";
import { getOcrLlmClient } from "@/lib/ocr/llm-client";
import {
  extractMileageKmFromText,
  preferMileageKm,
} from "@/lib/ocr/mileage-from-text";
import { TextParseError } from "@/lib/ocr/parse-error";
import {
  INVOICE_TEXT_PARSE_JSON_SCHEMA,
  invoiceTextParseSchema,
  normalizeTextParseResult,
  type InvoiceTextParseResult,
} from "@/lib/ocr/text-parse-schema";
import { inferInvoiceCategory } from "@/lib/ocr/infer-invoice-category";
import { resolveVendorName } from "@/lib/ocr/vendor-from-text";
import type { OcrJsonPayload } from "@/lib/ocr/ocr-types";

const PARSE_MAX_TOKENS = 2_400;
const MAX_RAW_TEXT_CHARS = 16_000;

function prepareInvoiceTextForLlm(rawText: string): string {
  return rawText
    .replace(/\r\n/g, "\n")
    .replace(/[^\S\n]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, MAX_RAW_TEXT_CHARS);
}

/**
 * analyzeDocument often passes stringified OCR JSON.
 * Prefer nested `text` (+ header lines) so newlines survive.
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

/**
 * Invoice-only LLM parse service.
 * Does not extract ABE/Teilegutachten fields — use {@link AbeParseService}.
 */
export class InvoiceParseService {
  /**
   * Parse OCR raw text / OCR JSON string into structured invoice fields.
   */
  async parseFromText(rawText: string): Promise<InvoiceTextParseResult> {
    const plainText = resolveOcrPlainText(rawText);
    const text = prepareInvoiceTextForLlm(plainText);
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

    let client: OpenAI;
    let fallbackModel: string;
    try {
      ({ client, model: fallbackModel } = getOcrLlmClient());
    } catch (error) {
      throw new TextParseError(
        error instanceof Error ? error.message : "LLM client is not configured.",
      );
    }

    let systemInstructions = INVOICE_SYSTEM_PROMPT;
    let model = fallbackModel;

    try {
      const agent = await loadFoundryAgentDefinition(
        getConfiguredFoundryAgentName(),
      );
      // Only reuse the Foundry model deployment — prompts stay invoice-only.
      if (agent?.model) {
        model = agent.model;
      }
    } catch {
      // Keep local invoice prompt + fallback model.
    }

    if (/^zeloxta/i.test(model)) {
      model = fallbackModel === model ? "gpt-5.4-nano" : fallbackModel;
    }

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
      throw new TextParseError("Invoice parse payload failed schema validation.");
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
    const scored = inferInvoiceCategory(categorySeed);

    let category: InvoiceTextParseResult["category"] =
      scored === "abe"
        ? parsed.category === "abe"
          ? "other"
          : parsed.category !== "other"
            ? parsed.category
            : "other"
        : scored !== "other"
          ? scored
          : parsed.category === "abe"
            ? "other"
            : parsed.category;

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
