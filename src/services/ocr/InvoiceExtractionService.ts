import "server-only";

import type OpenAI from "openai";

import {
  analyzeLayoutWithAzure,
  isAzureDocumentIntelligenceConfigured,
} from "@/lib/ocr/azure-document-intelligence";
import { sumLineItems } from "@/lib/documents/line-items";
import {
  extractInvoiceLineItemsFromAzureLayout,
  mergeLayoutAndLlmLineItems,
} from "@/lib/ocr/invoice-line-items-from-layout";
import { finalizeColumnFormatLineItems } from "@/lib/ocr/invoice-column-pipeline";
import {
  extractGrossTotalFromText,
  extractNetSumFromText,
  stripNonPositionInvoiceRows,
} from "@/lib/ocr/invoice-footer-totals";
import {
  extractInvoiceLineItemsFromText,
} from "@/lib/ocr/invoice-line-items-from-text";
import { realignShiftedInvoiceLineItems } from "@/lib/ocr/invoice-line-item-alignment";
import { isPlausibleInvoiceVatAmount } from "@/lib/ocr/invoice-vat";
import { reconcileInvoicePlausibility } from "@/lib/ocr/invoice-plausibility";
import { processLineItems } from "@/utils/invoiceMath";
import {
  normalizeVisionLineItemsPayload,
  readVisionTotalAmountRaw,
} from "@/lib/validations/invoiceExtractionSchema";
import {
  buildVisionUserMessage,
  prepareSinglePageOcrInput,
  resolveAzureLayoutInput,
  type DocumentBytesInput,
} from "@/lib/ocr/prepare-document-for-llm";
import { canDrawRowSeparators, drawInvoiceRowSeparatorsOnImage } from "@/lib/ocr/draw-invoice-row-separators";
import type { DocumentUserMessagePart } from "@/lib/ocr/llm-document-content";
import {
  buildOcrHintForLlm,
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
import { extractAmountFromText } from "@/lib/ocr/amount-from-text";
import {
  INVOICE_HEADER_USER_LINES,
  INVOICE_OVERVIEW_USER_LINES,
  buildInvoiceHeaderSystemPrompt,
  buildInvoiceLineItemsSystemPromptForFormat,
  buildInvoiceSystemPrompt,
  invoiceLineItemsUserLinesForFormat,
} from "@/lib/ocr/invoice-parse-prompts";
import { extractJsonObject } from "@/lib/ocr/json-from-llm";
import { getOcrLlmClient } from "@/lib/ocr/llm-client";
import {
  extractMileageKmFromText,
} from "@/lib/ocr/mileage-from-text";
import { resolveInvoiceParseModel, resolveParseModel } from "@/lib/ocr/model-routing";
import { coerceGermanMoneyAmount } from "@/lib/ocr/parse-german-money";
import { TextParseError } from "@/lib/ocr/parse-error";
import {
  sanitizeInvoiceMileageKm,
  type InvoiceHeaderExtraction,
  type InvoiceLineItemsExtraction,
  type InvoiceOverviewExtraction,
} from "@/lib/ocr/invoice-wizard-merge";
import {
  INVOICE_TEXT_PARSE_CATEGORIES,
  coerceLooseNumber,
  invoiceLineItemSchema,
  normalizeLineItemsList,
  type InvoiceLineItem,
  type InvoiceTextParseCategory,
} from "@/lib/ocr/text-parse-schema";

export type {
  InvoiceHeaderExtraction,
  InvoiceLineItemsExtraction,
  InvoiceOverviewExtraction,
} from "@/lib/ocr/invoice-wizard-merge";
export {
  mergeInvoiceWizardExtractions,
  mergeLineItemsExtractions,
  sanitizeInvoiceMileageKm,
} from "@/lib/ocr/invoice-wizard-merge";

const LINE_ITEMS_MAX_TOKENS = 8_192;
const HEADER_MAX_TOKENS = 1_500;
const OVERVIEW_MAX_TOKENS = 1_500;
const LINE_ITEMS_MAX_COUNT = 60;

const INVOICE_OVERVIEW_JSON_SCHEMA = {
  name: "invoice_wizard_overview",
  strict: true as const,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["vendor", "date", "amount", "category", "summary"],
    properties: {
      vendor: {
        type: ["string", "null"],
        description: "Werkstatt- / Händlername",
      },
      date: {
        type: ["string", "null"],
        description: "Rechnungsdatum YYYY-MM-DD",
      },
      amount: {
        type: ["number", "null"],
        description:
          "Zahlbetrag / Rechnungsbetrag / Gesamtbetrag brutto in EUR — nie Netto wenn Brutto sichtbar",
      },
      category: {
        type: "string",
        enum: [...INVOICE_TEXT_PARSE_CATEGORIES.filter((c) => c !== "abe")],
      },
      summary: {
        type: ["string", "null"],
        description: "Kurztitel 3–6 Wörter",
      },
    },
  },
};

const INVOICE_HEADER_JSON_SCHEMA = {
  name: "invoice_wizard_header",
  strict: true as const,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["vendor", "invoiceNumber", "mileageKm", "date"],
    properties: {
      vendor: {
        type: ["string", "null"],
        description: "Werkstattname aus dem Kopf",
      },
      invoiceNumber: {
        type: ["string", "null"],
        description: "Beleg- / Rechnungsnummer",
      },
      mileageKm: {
        type: ["integer", "null"],
        description:
          "Kilometerstand aus explizitem KM-Feld im Kopf (Integer, z.B. 142350). Null wenn kein KM-Feld oder unsicher.",
      },
      date: {
        type: ["string", "null"],
        description: "Rechnungsdatum YYYY-MM-DD",
      },
    },
  },
};

/**
 * Vision schema — German column fields (proven on Pos tables).
 * English aliases are normalized in {@link normalizeVisionLineItemsPayload}.
 */
const INVOICE_LINE_ITEMS_JSON_SCHEMA = {
  name: "invoice_wizard_line_items",
  strict: true as const,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["lineItems", "amount"],
    properties: {
      lineItems: {
        type: ["array", "null"],
        description:
          "Every position row left-to-right. Copy raw cell text — never compute totals.",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["label", "menge", "einzelpreis", "gesamtpreis"],
          properties: {
            label: {
              type: "string",
              description:
                "Merged description / Bezeichnung for this horizontal row.",
            },
            menge: {
              type: ["string", "null"],
              description:
                "Menge cell — e.g. \"1,00\", \"0,90\", \"7,00 Liter\". null if blank.",
            },
            einzelpreis: {
              type: ["string", "null"],
              description:
                "E-Preis / Einzelpreis cell — e.g. \"141,46 €\". null if blank.",
            },
            gesamtpreis: {
              type: ["string", "null"],
              description:
                "Ges. Preis / rightmost row total — e.g. \"331,98 €\". null if blank.",
            },
          },
        },
      },
      amount: {
        type: ["string", "null"],
        description:
          "Raw brutto Gesamtbetrag / Rechnungsbetrag if visible — never invoice number.",
      },
    },
  },
};

export type InvoiceExtractionOptions = {
  model?: string;
  /** Locked category from scan type picker (repair/service). */
  lockedCategory?: InvoiceTextParseCategory | null;
};

function parseHeaderMileage(
  raw: unknown,
  invoiceNumber: string | null,
): number | null {
  if (typeof raw === "string" && raw.trim()) {
    const fromText = extractMileageKmFromText(raw);
    const sanitized = sanitizeInvoiceMileageKm(fromText, invoiceNumber);
    if (sanitized !== null) return sanitized;
  }

  if (typeof raw === "number" && Number.isFinite(raw)) {
    const sanitized = sanitizeInvoiceMileageKm(raw, invoiceNumber);
    if (sanitized !== null) return sanitized;
  }

  const coerced = coerceLooseNumber(raw);
  return sanitizeInvoiceMileageKm(coerced, invoiceNumber);
}

function parseCategory(value: unknown): InvoiceTextParseCategory {
  if (
    typeof value === "string" &&
    (INVOICE_TEXT_PARSE_CATEGORIES as readonly string[]).includes(value) &&
    value !== "abe"
  ) {
    return value as InvoiceTextParseCategory;
  }
  return "other";
}

function parseNullableString(
  value: unknown,
  maxLen: number,
): string | null {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, maxLen)
    : null;
}

function parseIsoDate(value: unknown): string | null {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? value
    : null;
}

function parseLineItemsRaw(value: unknown): InvoiceLineItem[] | null {
  if (!Array.isArray(value)) return null;
  const parsed: InvoiceLineItem[] = [];
  for (const item of value) {
    const result = invoiceLineItemSchema.safeParse(item);
    if (result.success) parsed.push(result.data);
  }
  return normalizeLineItemsList(parsed, LINE_ITEMS_MAX_COUNT);
}

function sumLineItemAmounts(items: InvoiceLineItem[]): number | null {
  if (items.length === 0) return null;
  return (
    Math.round(items.reduce((sum, item) => sum + item.amount, 0) * 100) / 100
  );
}

async function runVisionExtract<T>(
  systemPrompt: string,
  userLines: readonly string[],
  input: DocumentBytesInput,
  jsonSchema: {
    name: string;
    strict: true;
    schema: Record<string, unknown>;
  },
  maxTokens: number,
  options: InvoiceExtractionOptions,
  errorLabel: string,
  userMessageParts?: DocumentUserMessagePart[],
): Promise<T> {
  const model = options.model?.trim() || resolveInvoiceParseModel();

  let client: OpenAI;
  let resolvedModel: string;
  try {
    ({ client, model: resolvedModel } = getOcrLlmClient({ model }));
  } catch (error) {
    throw new TextParseError(
      error instanceof Error ? error.message : "LLM client is not configured.",
    );
  }

  if (/^zeloxta/i.test(resolvedModel)) {
    resolvedModel = resolveInvoiceParseModel();
  }

  const userContent =
    userMessageParts ??
    buildVisionUserMessage(
      [
        "Deutsche Kfz-Rechnung oder Servicebeleg (PDF oder Scan).",
        ...userLines,
      ],
      input,
    );

  let completion: OpenAI.Chat.Completions.ChatCompletion;
  try {
    completion = await client.chat.completions.create({
      model: resolvedModel,
      max_completion_tokens: maxTokens,
      response_format: {
        type: "json_schema",
        json_schema: jsonSchema,
      },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "LLM request failed.";
    throw new TextParseError(`${errorLabel}: ${message}`);
  }

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new TextParseError(`${errorLabel}: empty response.`);
  }

  try {
    return extractJsonObject(content) as T;
  } catch {
    throw new TextParseError(`${errorLabel}: invalid JSON.`);
  }
}

export class InvoiceExtractionService {
  async extractOverviewFromDocument(
    input: DocumentBytesInput,
    options: InvoiceExtractionOptions = {},
  ): Promise<InvoiceOverviewExtraction> {
    const prepared = await prepareSinglePageOcrInput(input);
    const record = await runVisionExtract<Record<string, unknown>>(
      buildInvoiceSystemPrompt().replace(
        /lineItems = JEDE Tabellen/,
        "lineItems werden in einem separaten Scan erfasst — hier nicht extrahieren",
      ),
      INVOICE_OVERVIEW_USER_LINES,
      prepared,
      INVOICE_OVERVIEW_JSON_SCHEMA,
      OVERVIEW_MAX_TOKENS,
      options,
      "Invoice overview extract failed",
    );

    const category = options.lockedCategory
      ? options.lockedCategory
      : parseCategory(record.category);

    return {
      vendor: parseNullableString(record.vendor, 160),
      date: parseIsoDate(record.date),
      amount: coerceGermanMoneyAmount(record.amount, "conservative"),
      category: category === "abe" ? "other" : category,
      summary: parseNullableString(record.summary, 80),
    };
  }

  async extractHeaderFromDocument(
    input: DocumentBytesInput,
    options: InvoiceExtractionOptions = {},
  ): Promise<InvoiceHeaderExtraction> {
    const prepared = await prepareSinglePageOcrInput(input);
    const azureInput = resolveAzureLayoutInput(input, prepared);
    const azureLayout = isAzureDocumentIntelligenceConfigured()
      ? await analyzeLayoutWithAzure(azureInput.bytes, azureInput.contentType)
      : null;

    const record = await runVisionExtract<Record<string, unknown>>(
      buildInvoiceHeaderSystemPrompt(),
      INVOICE_HEADER_USER_LINES,
      prepared,
      INVOICE_HEADER_JSON_SCHEMA,
      HEADER_MAX_TOKENS,
      options,
      "Invoice header extract failed",
    );

    const invoiceNumber = parseNullableString(record.invoiceNumber, 80);
    let mileageKm = parseHeaderMileage(record.mileageKm, invoiceNumber);
    if (mileageKm == null && azureLayout?.content) {
      mileageKm = sanitizeInvoiceMileageKm(
        extractMileageKmFromText(azureLayout.content),
        invoiceNumber,
      );
    }

    return {
      vendor: parseNullableString(record.vendor, 160),
      invoiceNumber,
      mileageKm,
      date: parseIsoDate(record.date),
    };
  }

  /** Azure layout OCR, row separators, then vision LLM merge for invoice positions. */
  async extractLineItemsFromDocument(
    input: DocumentBytesInput,
    options: InvoiceExtractionOptions = {},
  ): Promise<InvoiceLineItemsExtraction> {
    const prepared = await prepareSinglePageOcrInput(input);
    const azureInput = resolveAzureLayoutInput(input, prepared);

    const azureLayout = isAzureDocumentIntelligenceConfigured()
      ? await analyzeLayoutWithAzure(azureInput.bytes, azureInput.contentType)
      : null;

    const ocrText = azureLayout?.content ?? "";
    const tableFormat = detectInvoiceTableFormat(ocrText);
    const isWorkshopFormat = tableFormat === "workshop-sections";
    const isLlmOnlyFormat = tableFormat === "unknown";

    let llmInput = prepared;
    let rowSeparators = false;
    let rowMarkersLeft = false;
    if (
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

    const userLines = invoiceLineItemsUserLinesForFormat(tableFormat);

    const instructionLines: string[] = [
      "Deutsche Kfz-Rechnung oder Servicebeleg (PDF oder Scan).",
      ...userLines,
    ];

    if ((isWorkshopFormat || isLlmOnlyFormat) && ocrText.trim()) {
      instructionLines.push(
        "",
        "Azure-OCR-Text (Struktur-Hinweis — Bild ist maßgeblich):",
        buildOcrHintForLlm(ocrText),
      );
    }

    const visionMessage = buildVisionUserMessage(
      instructionLines,
      llmInput,
      { rowSeparators, rowMarkersLeft },
    );

    const record = await runVisionExtract<Record<string, unknown>>(
      buildInvoiceLineItemsSystemPromptForFormat(tableFormat),
      userLines,
      prepared,
      INVOICE_LINE_ITEMS_JSON_SCHEMA,
      LINE_ITEMS_MAX_TOKENS,
      options,
      "Invoice line items extract failed",
      visionMessage,
    );

    // LLM outputs raw strings per column — run bulletproof math before merge/save.
    const finalItems = processLineItems(normalizeVisionLineItemsPayload(record), {
      checksumMode: tableFormat === "column" ? "column" : "standard",
    });
    let llmLineItems: InvoiceLineItem[] = finalItems
      .filter(
        (item) =>
          typeof item.label === "string" &&
          item.label.trim().length > 0 &&
          typeof item.gesamtpreis === "number" &&
          item.gesamtpreis > 0,
      )
      .map((item) => ({
        label: String(item.label).trim(),
        amount: item.gesamtpreis,
      }));

    llmLineItems =
      isWorkshopFormat
        ? (resolveWorkshopLineItems({ llmItems: llmLineItems, ocrText }) ??
          llmLineItems)
        : llmLineItems;

    const layoutLineItems =
      shouldMergeAzureLayout(tableFormat) && azureLayout
        ? extractInvoiceLineItemsFromAzureLayout(azureLayout)
        : null;

    const footerNet = ocrText.trim() ? extractNetSumFromText(ocrText) : null;
    const footerGross = ocrText.trim() ? extractGrossTotalFromText(ocrText) : null;

    let structuredAmount = coerceGermanMoneyAmount(
      readVisionTotalAmountRaw(record),
      "conservative",
    );
    if (
      structuredAmount != null &&
      footerGross != null &&
      structuredAmount < footerGross - 0.05
    ) {
      if (footerNet != null && Math.abs(structuredAmount - footerNet) <= 0.05) {
        structuredAmount = footerGross;
      } else if (
        footerNet != null &&
        isPlausibleInvoiceVatAmount(structuredAmount, footerNet)
      ) {
        structuredAmount = footerGross;
      }
    }

    const amount =
      structuredAmount ??
      footerGross ??
      (isWorkshopFormat ? extractWorkshopInvoiceAmount(ocrText) : null) ??
      (ocrText.trim() ? extractAmountFromText(ocrText) : null) ??
      (layoutLineItems?.length ? sumLineItems(layoutLineItems) : null);

    const hasUsableColumnLayout =
      shouldMergeAzureLayout(tableFormat) &&
      (layoutLineItems?.length ?? 0) >= 3;

    if (tableFormat === "column") {
      const columnResult = finalizeColumnFormatLineItems({
        llmItems: llmLineItems,
        layoutItems: layoutLineItems,
        ocrText,
        grossAmount: footerGross ?? amount,
        maxItems: LINE_ITEMS_MAX_COUNT,
      });
      return {
        lineItems: columnResult.lineItems,
        amount: columnResult.amount,
      };
    }

    // workshop-sections + unknown: modern pipeline (plausibility, section parser, OCR heuristics).
    const llmNetSum = sumLineItems(llmLineItems);
    const layoutNetSum = layoutLineItems?.length
      ? layoutLineItems.reduce((sum, item) => sum + item.amount, 0)
      : null;

    // Only trust a source exclusively when it reconciles with Nettosumme.
    // Never prefer garbled Azure OCR just because a footer is missing.
    const LAYOUT_NET_TOLERANCE_EUR = 1.5;
    const layoutDelta =
      footerNet != null && layoutNetSum != null
        ? Math.abs(layoutNetSum - footerNet)
        : null;
    const llmDelta =
      footerNet != null && llmNetSum != null
        ? Math.abs(llmNetSum - footerNet)
        : null;
    const layoutTrusted =
      layoutDelta != null && layoutDelta <= LAYOUT_NET_TOLERANCE_EUR;
    const llmTrusted =
      llmDelta != null && llmDelta <= LAYOUT_NET_TOLERANCE_EUR;

    let preferLayoutRows = false;
    let preferLlmRows = false;
    if (hasUsableColumnLayout) {
      if (layoutTrusted && !llmTrusted) {
        preferLayoutRows = true;
      } else if (llmTrusted && !layoutTrusted) {
        preferLlmRows = true;
      } else if (layoutTrusted && llmTrusted) {
        preferLayoutRows = true;
      } else if (layoutDelta != null && llmDelta != null) {
        if (layoutDelta + 0.05 < llmDelta) preferLayoutRows = true;
        else if (llmDelta + 0.05 < layoutDelta) preferLlmRows = true;
      }
    }

    const merged = shouldMergeAzureLayout(tableFormat)
      ? mergeLayoutAndLlmLineItems(llmLineItems, layoutLineItems, amount, {
          trustedNetTotal: footerNet,
          preferLayoutRows,
          preferLlmRows,
        })
      : llmLineItems.length > 0
        ? llmLineItems
        : null;

    let baseItems = stripNonPositionInvoiceRows(merged);
    if (
      isWorkshopFormat &&
      shouldReconcileWithOcrHeuristics(tableFormat) &&
      ocrText.trim()
    ) {
      baseItems = reconcileWorkshopLineItemsWithOcrText(baseItems, ocrText);
    }

    const ocrHeuristicItems = ocrText.trim()
      ? stripNonPositionInvoiceRows(extractInvoiceLineItemsFromText(ocrText))
      : null;

    const plausibility = reconcileInvoicePlausibility({
      lineItems: baseItems,
      amount: footerGross ?? amount,
      ocrText,
      ocrHeuristicItems: isWorkshopFormat ? null : ocrHeuristicItems,
      enableRealign: shouldRealignLineItems(tableFormat),
      enableOcrReconcile:
        shouldReconcileWithOcrHeuristics(tableFormat) && !isWorkshopFormat,
    });

    const normalized = normalizeLineItemsList(
      plausibility.lineItems,
      LINE_ITEMS_MAX_COUNT,
    );

    return {
      lineItems: normalized,
      amount: plausibility.amount,
    };
  }
}

export const invoiceExtractionService = new InvoiceExtractionService();
