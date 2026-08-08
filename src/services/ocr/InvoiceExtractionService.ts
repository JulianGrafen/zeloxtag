import type OpenAI from "openai";

import { preferAmount } from "@/lib/ocr/amount-from-text";
import {
  buildDocumentUserMessage,
  type DocumentBytesInput,
} from "@/lib/ocr/llm-document-content";
import { preferInvoiceCategory } from "@/lib/ocr/infer-invoice-category";
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
  INVOICE_TEXT_PARSE_CATEGORIES,
  coerceLooseNumber,
  invoiceLineItemSchema,
  normalizeLineItemsList,
  normalizeTextParseResult,
  type InvoiceLineItem,
  type InvoiceTextParseCategory,
  type InvoiceTextParseResult,
} from "@/lib/ocr/text-parse-schema";

const LINE_ITEMS_MAX_TOKENS = 8_192;
const HEADER_MAX_TOKENS = 1_500;
const OVERVIEW_MAX_TOKENS = 1_500;
const LINE_ITEMS_MAX_COUNT = 60;
const MIN_KM = 500;
const MAX_KM = 9_999_999;

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

export type InvoiceOverviewExtraction = {
  vendor: string | null;
  date: string | null;
  amount: number | null;
  category: InvoiceTextParseCategory;
  summary: string | null;
};

export type InvoiceHeaderExtraction = {
  vendor: string | null;
  invoiceNumber: string | null;
  mileageKm: number | null;
  date: string | null;
};

export type InvoiceLineItemsExtraction = {
  lineItems: InvoiceLineItem[] | null;
  amount: number | null;
};

/** Merge multiple position-block scans (multi-page invoices). */
export function mergeLineItemsExtractions(
  blocks: InvoiceLineItemsExtraction[],
): InvoiceLineItemsExtraction {
  if (blocks.length === 0) {
    return { lineItems: null, amount: null };
  }
  if (blocks.length === 1) {
    return blocks[0]!;
  }

  const seen = new Set<string>();
  const merged: InvoiceLineItem[] = [];

  for (const block of blocks) {
    for (const item of block.lineItems ?? []) {
      const key = `${item.label.trim().toLowerCase()}|${item.amount}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(item);
    }
  }

  const lineItems = normalizeLineItemsList(merged, LINE_ITEMS_MAX_COUNT);
  const amount =
    blocks.map((block) => block.amount).find((value) => value !== null) ??
    null;

  return { lineItems, amount };
}

export type InvoiceExtractionOptions = {
  model?: string;
  /** Locked category from scan type picker (repair/service). */
  lockedCategory?: InvoiceTextParseCategory | null;
};

/** Reject common LLM mileage mistakes (decimals, invoice #, out of range). */
export function sanitizeInvoiceMileageKm(
  value: number | null | undefined,
  invoiceNumber: string | null,
): number | null {
  if (value == null || !Number.isFinite(value)) return null;

  const rounded = Math.round(value);
  if (Math.abs(value - rounded) > 0.001) return null;
  if (rounded < MIN_KM || rounded > MAX_KM) return null;

  if (invoiceNumber) {
    const invDigits = invoiceNumber.replace(/\D/g, "");
    if (invDigits.length >= 4 && invDigits === String(rounded)) return null;
  }

  return rounded;
}

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

  const userContent = buildDocumentUserMessage(
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

/**
 * Merge guided wizard extractions into a single review payload.
 * Line items come exclusively from the dedicated positions scan (LLM pass).
 */
export function mergeInvoiceWizardExtractions(
  overview: InvoiceOverviewExtraction | null,
  header: InvoiceHeaderExtraction,
  lineItemsBlock: InvoiceLineItemsExtraction,
  options: { lockedCategory?: InvoiceTextParseCategory | null } = {},
): InvoiceTextParseResult {
  const vendor = header.vendor ?? overview?.vendor ?? null;
  const date = header.date ?? overview?.date ?? null;
  const lineItems = lineItemsBlock.lineItems;
  const categorySeed = [
    overview?.summary,
    overview?.category,
    vendor,
    lineItems?.map((item) => item.label).join(" "),
  ]
    .filter(Boolean)
    .join("\n");

  const category = options.lockedCategory
    ? options.lockedCategory
    : preferInvoiceCategory(
        overview?.category ?? "other",
        categorySeed,
      );

  const amount = preferAmount(
    lineItemsBlock.amount ?? overview?.amount ?? null,
    "",
    lineItems,
  );

  const mileageKm = sanitizeInvoiceMileageKm(
    parseHeaderMileage(header.mileageKm, header.invoiceNumber),
    header.invoiceNumber,
  );

  return normalizeTextParseResult({
    vendor,
    date,
    amount,
    category: category === "abe" ? "other" : category,
    summary: overview?.summary ?? null,
    lineItems,
    kbaNumber: null,
    vehicleApprovals: null,
    authority: null,
    conditions: null,
    partCategory: null,
    notes: null,
    manufacturer: null,
    invoiceNumber: header.invoiceNumber,
    mileageKm,
  });
}

export class InvoiceExtractionService {
  async extractOverviewFromDocument(
    input: DocumentBytesInput,
    options: InvoiceExtractionOptions = {},
  ): Promise<InvoiceOverviewExtraction> {
    const record = await runVisionExtract<Record<string, unknown>>(
      buildInvoiceSystemPrompt().replace(
        /lineItems = JEDE Tabellen/,
        "lineItems werden in einem separaten Scan erfasst — hier nicht extrahieren",
      ),
      INVOICE_OVERVIEW_USER_LINES,
      input,
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
    const record = await runVisionExtract<Record<string, unknown>>(
      buildInvoiceHeaderSystemPrompt(),
      INVOICE_HEADER_USER_LINES,
      input,
      INVOICE_HEADER_JSON_SCHEMA,
      HEADER_MAX_TOKENS,
      options,
      "Invoice header extract failed",
    );

    const invoiceNumber = parseNullableString(record.invoiceNumber, 80);
    const mileageKm = parseHeaderMileage(record.mileageKm, invoiceNumber);

    return {
      vendor: parseNullableString(record.vendor, 160),
      invoiceNumber,
      mileageKm,
      date: parseIsoDate(record.date),
    };
  }

  /** Dedicated LLM pass for invoice line items — no heuristics, no skipping. */
  async extractLineItemsFromDocument(
    input: DocumentBytesInput,
    options: InvoiceExtractionOptions = {},
  ): Promise<InvoiceLineItemsExtraction> {
    const record = await runVisionExtract<Record<string, unknown>>(
      buildInvoiceLineItemsSystemPrompt(),
      INVOICE_LINE_ITEMS_USER_LINES,
      input,
      INVOICE_LINE_ITEMS_JSON_SCHEMA,
      LINE_ITEMS_MAX_TOKENS,
      options,
      "Invoice line items extract failed",
    );

    return {
      lineItems: parseLineItemsRaw(record.lineItems),
      amount: coerceGermanMoneyAmount(record.amount, "conservative"),
    };
  }
}

export const invoiceExtractionService = new InvoiceExtractionService();
