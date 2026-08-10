import "server-only";

import type OpenAI from "openai";

import {
  analyzeLayoutWithAzure,
  isAzureDocumentIntelligenceConfigured,
} from "@/lib/ocr/azure-document-intelligence";
import { sumLineItems } from "@/lib/documents/line-items";
import { realignShiftedInvoiceLineItems } from "@/lib/ocr/invoice-line-item-alignment";
import {
  extractInvoiceLineItemsFromAzureLayout,
  mergeLayoutAndLlmLineItems,
} from "@/lib/ocr/invoice-line-items-from-layout";
import { reconcileLineItemAmountsWithOcrText } from "@/lib/ocr/invoice-line-items-from-text";
import { ensureInvoiceVatAndGrossTotal } from "@/lib/ocr/invoice-vat";
import { processLineItems } from "@/utils/invoiceMath";
import {
  buildVisionUserMessage,
  prepareSinglePageOcrInput,
  type DocumentBytesInput,
} from "@/lib/ocr/prepare-document-for-llm";
import { canDrawRowSeparators, drawInvoiceRowSeparatorsOnImage } from "@/lib/ocr/draw-invoice-row-separators";
import type { DocumentUserMessagePart } from "@/lib/ocr/llm-document-content";
import {
  detectInvoiceTableFormat,
  buildWorkshopOcrHint,
  shouldDrawInvoiceRowSeparators,
  shouldMergeAzureLayout,
} from "@/lib/ocr/invoice-format-routing";
import {
  extractWorkshopInvoiceAmount,
  reconcileWorkshopLineItemsWithOcrText,
  resolveWorkshopLineItems,
} from "@/lib/ocr/invoice-workshop-sections";
import {
  INVOICE_HEADER_USER_LINES,
  INVOICE_LINE_ITEMS_USER_LINES,
  INVOICE_OVERVIEW_USER_LINES,
  INVOICE_WORKSHOP_LINE_ITEMS_USER_LINES,
  buildInvoiceHeaderSystemPrompt,
  buildInvoiceLineItemsSystemPrompt,
  buildInvoiceWorkshopLineItemsSystemPrompt,
  buildInvoiceSystemPrompt,
} from "@/lib/ocr/invoice-parse-prompts";
import { extractJsonObject } from "@/lib/ocr/json-from-llm";
import { getOcrLlmClient } from "@/lib/ocr/llm-client";
import {
  extractMileageKmFromText,
} from "@/lib/ocr/mileage-from-text";
import { resolveParseModel } from "@/lib/ocr/model-routing";
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
 * "Extract & Compute" schema — LLM outputs raw column strings, never computes.
 * TypeScript handles all arithmetic via `parseLlmRawLineItems`.
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
          "Every position row. Output raw text from each column — never compute totals yourself.",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["label", "menge", "einzelpreis", "gesamtpreis"],
          properties: {
            label: {
              type: "string",
              description: "Positionsbezeichnung — exact text from the description column.",
            },
            menge: {
              type: ["string", "null"],
              description:
                "Exact text from the 'Menge' / 'Qty' / 'Anzahl' column, e.g. \"4\", \"7,00 Liter\". null when the cell is blank.",
            },
            einzelpreis: {
              type: ["string", "null"],
              description:
                "Exact text from the 'Einzelpreis' / 'E-Preis' / 'EP' column, e.g. \"120,00\". null when the cell is blank.",
            },
            gesamtpreis: {
              type: ["string", "null"],
              description:
                "Exact text from the 'Ges. Preis' / 'Gesamtpreis' / 'GP' / rightmost total column, e.g. \"480,00\". null when the cell is blank.",
            },
          },
        },
      },
      amount: {
        type: ["string", "null"],
        description:
          "Raw text of the invoice total (Zahlbetrag / Rechnungsbetrag / Gesamtbetrag) if visible in this section. null otherwise.",
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
  const model = options.model?.trim() || resolveParseModel("invoice");

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
    resolvedModel = resolveParseModel("invoice");
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
    const azureLayout = isAzureDocumentIntelligenceConfigured()
      ? await analyzeLayoutWithAzure(prepared.bytes, prepared.contentType)
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

    const azureLayout = isAzureDocumentIntelligenceConfigured()
      ? await analyzeLayoutWithAzure(prepared.bytes, prepared.contentType)
      : null;

    const ocrText = azureLayout?.content ?? "";
    const tableFormat = detectInvoiceTableFormat(ocrText);
    const isWorkshopFormat = tableFormat === "workshop-sections";

    let llmInput = prepared;
    let rowSeparators = false;
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
    }

    const userLines = isWorkshopFormat
      ? INVOICE_WORKSHOP_LINE_ITEMS_USER_LINES
      : INVOICE_LINE_ITEMS_USER_LINES;

    const instructionLines: string[] = [
      "Deutsche Kfz-Rechnung oder Servicebeleg (PDF oder Scan).",
      ...userLines,
    ];

    if (isWorkshopFormat && ocrText.trim()) {
      instructionLines.push(
        "",
        "Azure-OCR-Text (Struktur-Hinweis — Bild ist maßgeblich):",
        buildWorkshopOcrHint(ocrText),
      );
    }

    const visionMessage = buildVisionUserMessage(
      instructionLines,
      llmInput,
      { rowSeparators },
    );

    const record = await runVisionExtract<Record<string, unknown>>(
      isWorkshopFormat
        ? buildInvoiceWorkshopLineItemsSystemPrompt()
        : buildInvoiceLineItemsSystemPrompt(),
      userLines,
      prepared,
      INVOICE_LINE_ITEMS_JSON_SCHEMA,
      LINE_ITEMS_MAX_TOKENS,
      options,
      "Invoice line items extract failed",
      visionMessage,
    );

    // LLM outputs raw strings per column — run bulletproof math before merge/save.
    const finalItems = processLineItems(
      Array.isArray(record.lineItems) ? record.lineItems : [],
    );
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

    const amount =
      coerceGermanMoneyAmount(record.amount, "conservative") ??
      (isWorkshopFormat
        ? extractWorkshopInvoiceAmount(ocrText)
        : null) ??
      (layoutLineItems?.length ? sumLineItems(layoutLineItems) : null);

    const merged = shouldMergeAzureLayout(tableFormat)
      ? mergeLayoutAndLlmLineItems(llmLineItems, layoutLineItems, amount)
      : llmLineItems.length > 0
        ? llmLineItems
        : null;

    const reconciled =
      isWorkshopFormat && ocrText.trim()
        ? reconcileWorkshopLineItemsWithOcrText(merged, ocrText)
        : ocrText.trim()
          ? reconcileLineItemAmountsWithOcrText(merged, ocrText)
          : merged;

    const aligned = isWorkshopFormat
      ? reconciled
      : realignShiftedInvoiceLineItems(reconciled, amount);

    const normalized = normalizeLineItemsList(aligned, LINE_ITEMS_MAX_COUNT);
    const withVat = ensureInvoiceVatAndGrossTotal({
      lineItems: normalized,
      amount,
      ocrText,
    });

    return { lineItems: withVat.lineItems, amount: withVat.amount };
  }
}

export const invoiceExtractionService = new InvoiceExtractionService();
