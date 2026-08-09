import "server-only";

import type OpenAI from "openai";

import {
  analyzeLayoutWithAzure,
  isAzureDocumentIntelligenceConfigured,
} from "@/lib/ocr/azure-document-intelligence";
import { realignShiftedInvoiceLineItems } from "@/lib/ocr/invoice-line-item-alignment";
import {
  extractInvoiceLineItemsFromAzureLayout,
  mergeLayoutAndLlmLineItems,
} from "@/lib/ocr/invoice-line-items-from-layout";
import { reconcileLineItemAmountsWithOcrText } from "@/lib/ocr/invoice-line-items-from-text";
import {
  buildVisionUserMessage,
  prepareSinglePageOcrInput,
  type DocumentBytesInput,
} from "@/lib/ocr/prepare-document-for-llm";
import { canDrawRowSeparators, drawInvoiceRowSeparatorsOnImage } from "@/lib/ocr/draw-invoice-row-separators";
import type { DocumentUserMessagePart } from "@/lib/ocr/llm-document-content";
import {
  INVOICE_HEADER_USER_LINES,
  INVOICE_LINE_ITEMS_USER_LINES,
  INVOICE_OVERVIEW_USER_LINES,
  buildInvoiceHeaderSystemPrompt,
  buildInvoiceLineItemsSystemPrompt,
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
          "Jede Rechnungsposition einzeln — keine Zeile auslassen, nicht zusammenfassen.",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["label", "amount"],
          properties: {
            label: {
              type: "string",
              description: "Positionsbezeichnung",
            },
            amount: {
              type: "number",
              description:
                "NUR Ges. Preis / Gesamtpreis / Wert aus der RECHTSTEN Summenspalte. NIE Einzelpreis/EP/Stückpreis. Bei mehreren €-Betrag den rechtesten.",
            },
          },
        },
      },
      amount: {
        type: ["number", "null"],
        description: "Rechnungs-Gesamtbetrag wenn in diesem Abschnitt sichtbar",
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

    let llmInput = prepared;
    let rowSeparators = false;
    if (canDrawRowSeparators(prepared.bytes, prepared.contentType)) {
      const drawn = await drawInvoiceRowSeparatorsOnImage(
        prepared.bytes,
        azureLayout,
      );
      llmInput = { bytes: drawn.bytes, contentType: "image/png" };
      rowSeparators = drawn.separatorsDrawn > 0;
    }

    const visionMessage = buildVisionUserMessage(
      [
        "Deutsche Kfz-Rechnung oder Servicebeleg (PDF oder Scan).",
        ...INVOICE_LINE_ITEMS_USER_LINES,
      ],
      llmInput,
      { rowSeparators },
    );

    const record = await runVisionExtract<Record<string, unknown>>(
      buildInvoiceLineItemsSystemPrompt(),
      INVOICE_LINE_ITEMS_USER_LINES,
      prepared,
      INVOICE_LINE_ITEMS_JSON_SCHEMA,
      LINE_ITEMS_MAX_TOKENS,
      options,
      "Invoice line items extract failed",
      visionMessage,
    );

    const llmLineItems = parseLineItemsRaw(record.lineItems);
    const layoutLineItems = azureLayout
      ? extractInvoiceLineItemsFromAzureLayout(azureLayout)
      : null;
    const amount =
      coerceGermanMoneyAmount(record.amount, "conservative") ??
      (layoutLineItems?.length
        ? sumLineItemAmounts(layoutLineItems)
        : null);

    const merged = mergeLayoutAndLlmLineItems(
      llmLineItems,
      layoutLineItems,
      amount,
    );
    const reconciled = azureLayout?.content
      ? reconcileLineItemAmountsWithOcrText(merged, azureLayout.content)
      : merged;
    const lineItems = normalizeLineItemsList(
      realignShiftedInvoiceLineItems(reconciled, amount),
      LINE_ITEMS_MAX_COUNT,
    );

    return { lineItems, amount };
  }
}

export const invoiceExtractionService = new InvoiceExtractionService();
