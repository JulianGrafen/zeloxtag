import type OpenAI from "openai";

import { preferAmount, extractAmountFromText } from "@/lib/ocr/amount-from-text";
import {
  prepareSinglePageOcrInput,
  resolveAzureLayoutInput,
  type DocumentBytesInput,
} from "@/lib/ocr/prepare-document-for-llm";
import {
  analyzeLayoutWithAzure,
  buildOcrPayloadFromAzureLayout,
  isAzureDocumentIntelligenceConfigured,
} from "@/lib/ocr/azure-document-intelligence";
import { buildStubOcrPayload } from "@/lib/ocr/llm-document-content";
import {
  mergeContinuationInvoiceLineItems,
  realignShiftedInvoiceLineItems,
} from "@/lib/ocr/invoice-line-item-alignment";
import { mergeLayoutAndLlmLineItems } from "@/lib/ocr/invoice-line-items-from-layout";
import {
  extractInvoiceLineItemsFromText,
  preferInvoiceLineItems,
} from "@/lib/ocr/invoice-line-items-from-text";
import { reconcileInvoicePlausibility } from "@/lib/ocr/invoice-plausibility";
import {
  fenceUntrustedDocumentText,
  UNTRUSTED_TEXT_SYSTEM_RULE,
} from "@/lib/ocr/untrusted-document-text";
import { preferInvoiceCategory } from "@/lib/ocr/infer-invoice-category";
import {
  buildInvoiceSystemPrompt,
  buildTuevCostSystemPrompt,
  INVOICE_USER_PROMPT_LINES,
  TUEV_COST_USER_PROMPT_LINES,
} from "@/lib/ocr/invoice-parse-prompts";
import {
  detectInvoiceTableFormat,
  shouldMergeContinuationLineItems,
  shouldRealignLineItems,
} from "@/lib/ocr/invoice-format-routing";
import {
  resolveWorkshopLineItems,
  sectionOcrMatchesFooterNet,
} from "@/lib/ocr/invoice-workshop-sections";
import {
  extractGrossTotalFromText,
  extractNetSumFromText,
} from "@/lib/ocr/invoice-footer-totals";
import { extractInvoiceFromImage } from "@/lib/ocr/invoice-vision-extract";
import { describeInvoiceVerificationIssue } from "@/lib/ocr/invoice-extraction-verify";
import { mapParsedInvoiceToTextParseResult } from "@/services/invoice/map-parsed-invoice-to-text-parse";
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
  /**
   * False when the extracted positions do not add up to the totals printed on
   * the document — the review screen asks the user to check them.
   */
  lineItemsVerified: boolean;
  /** German review hint when `lineItemsVerified` is false. */
  lineItemsWarning: string | null;
};

/**
 * Invoice-only LLM parse service.
 * Invoices are extracted by a single vision call and verified against the
 * printed totals; no heuristic re-pairs descriptions with amounts.
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
    return options.documentType === "tuev"
      ? this.parseTuevCostsFromDocument(input, options)
      : this.parseInvoiceFromDocument(input, options);
  }

  /**
   * LLM-only invoice extraction: one vision call for header, positions and
   * totals, then an arithmetic check against the printed Nettosumme.
   */
  private async parseInvoiceFromDocument(
    input: DocumentBytesInput,
    options: InvoiceDocumentParseOptions,
  ): Promise<InvoiceDocumentParseResult> {
    const { client, model } = this.resolveClient(
      options.model ?? resolveInvoiceParseModel(),
    );

    const prepared = await prepareSinglePageOcrInput(input);
    const azureInput = resolveAzureLayoutInput(input, prepared);
    const azureLayout = isAzureDocumentIntelligenceConfigured()
      ? await analyzeLayoutWithAzure(azureInput.bytes, azureInput.contentType)
      : null;

    const ocrJson = azureLayout
      ? buildOcrPayloadFromAzureLayout(azureLayout)
      : buildStubOcrPayload(prepared.contentType);
    const ocrText = azureLayout
      ? deduplicateInvoiceItemTable(ocrJson.text)
      : "";

    const extraction = await extractInvoiceFromImage({
      client: {
        chat: {
          completions: {
            create: (body) => client.chat.completions.create(body),
          },
        },
      },
      model,
      image: prepared,
      ocrTotals: {
        net: extractNetSumFromText(ocrText),
        gross: extractGrossTotalFromText(ocrText),
      },
    });

    const fields = this.nullAbeFields(
      mapParsedInvoiceToTextParseResult(
        {
          vendor_name: extraction.vendorName,
          invoice_number: extraction.invoiceNumber,
          invoice_date: extraction.invoiceDate,
          vehicle: {
            vin: null,
            hsn_tsn: null,
            license_plate: null,
            mileage: extraction.mileageKm,
          },
          totals: extraction.totals,
          line_items: extraction.lineItems,
          reconciliation: {
            line_items_net_sum: extraction.verdict.positionsSum ?? 0,
            line_items_count: extraction.lineItems.length,
            net_delta: extraction.verdict.delta,
            gross_delta: null,
            vat_delta: null,
            net_reconciled: extraction.verdict.verified,
            gross_reconciled: extraction.verdict.verified,
            vat_reconciled: extraction.verdict.verified,
          },
        },
        {
          rawMarkdown: ocrText,
          llmCategory: extraction.category,
          llmAuthoritative: true,
        },
      ),
    );

    console.info(
      `[InvoiceParseService] vision extract: positions=${fields.lineItems?.length ?? 0} sum=${extraction.verdict.positionsSum} printed=${extraction.verdict.expectedTotal} verified=${extraction.verdict.verified} attempts=${extraction.attempts}`,
    );

    return {
      fields,
      ocrJson,
      lineItemsVerified: extraction.verdict.verified,
      lineItemsWarning: describeInvoiceVerificationIssue(extraction.verdict),
    };
  }

  /** HU/AU Prüfbericht costs — separate prompt/schema from invoices. */
  private async parseTuevCostsFromDocument(
    input: DocumentBytesInput,
    options: InvoiceDocumentParseOptions,
  ): Promise<InvoiceDocumentParseResult> {
    const { client, model } = this.resolveClient(
      options.model ?? resolveParseModel("tuev"),
    );

    const userContent = await buildTuevDocumentUserMessage(
      [
        "This is a German HU/AU inspection report (TÜV-Bericht).",
        ...TUEV_COST_USER_PROMPT_LINES,
      ],
      input,
    );

    let completion: OpenAI.Chat.Completions.ChatCompletion;
    try {
      completion = await client.chat.completions.create({
        model,
        max_completion_tokens: PARSE_MAX_TOKENS,
        response_format: {
          type: "json_schema",
          json_schema: buildInvoiceTextParseJsonSchema({
            documentType: "tuev",
          }),
        },
        messages: [
          {
            role: "system",
            content: buildTuevCostSystemPrompt().replace(
              /OCR-Input ist Markdown/g,
              "Lies das hochgeladene Dokument",
            ),
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

    return {
      fields: this.nullAbeFields(normalizeTextParseResult(parsed.data)),
      ocrJson: buildStubOcrPayload(input.contentType),
      lineItemsVerified: true,
      lineItemsWarning: null,
    };
  }

  private resolveClient(routedModel: string): { client: OpenAI; model: string } {
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
    return {
      client,
      model: /^zeloxta/i.test(model) ? resolveInvoiceParseModel() : model,
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
          {
            role: "system",
            content: [systemInstructions, UNTRUSTED_TEXT_SYSTEM_RULE].join("\n"),
          },
          {
            role: "user",
            content: [
              ...INVOICE_USER_PROMPT_LINES,
              "",
              fenceUntrustedDocumentText(text),
            ].join("\n"),
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
    const preferred =
      resolveWorkshopLineItems({
        llmItems: preferInvoiceLineItems(
          normalized.lineItems,
          heuristicLineItems,
        ),
        ocrText: plainText,
      }) ??
      preferInvoiceLineItems(normalized.lineItems, heuristicLineItems);
    const tableFormat = detectInvoiceTableFormat(plainText);
    const skipColumnPostProcess = sectionOcrMatchesFooterNet(plainText);
    const mergedContinuations =
      !skipColumnPostProcess && shouldMergeContinuationLineItems(tableFormat)
        ? mergeContinuationInvoiceLineItems(preferred) ?? preferred
        : preferred;
    const lineItems =
      !skipColumnPostProcess && shouldRealignLineItems(tableFormat)
        ? realignShiftedInvoiceLineItems(
            mergedContinuations,
            preferAmount(normalized.amount, plainText, normalized.lineItems),
          )
        : mergedContinuations;

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
