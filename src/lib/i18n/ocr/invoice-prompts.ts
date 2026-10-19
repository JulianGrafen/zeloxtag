import type { AppLocale } from "@/lib/i18n/types";
import {
  HYBRID_INVOICE_EN_HEADER,
  INVOICE_EN_CURRENCY_RULES,
  INVOICE_EN_DATE_RULES,
  INVOICE_EN_ODOMETER_RULES,
  INVOICE_EN_TABLE_RULES,
} from "@/lib/i18n/ocr/invoice-extraction-rules-en";
import { HYBRID_INVOICE_PROMPT_DE } from "@/lib/i18n/ocr/hybrid-invoice-prompt-de";
import {
  buildInvoiceHeaderSystemPrompt as buildInvoiceHeaderSystemPromptDe,
  buildInvoiceSystemPrompt as buildInvoiceSystemPromptDe,
  buildInvoiceVisionSystemPrompt as buildInvoiceVisionSystemPromptDe,
} from "@/lib/ocr/invoice-parse-prompts";

const EN_INVOICE_VISION_APPENDIX = [
  INVOICE_EN_DATE_RULES,
  INVOICE_EN_CURRENCY_RULES,
  INVOICE_EN_ODOMETER_RULES,
  INVOICE_EN_TABLE_RULES,
].join("\n\n");

export function buildHybridInvoiceSystemPrompt(locale: AppLocale = "de"): string {
  if (locale === "de") {
    return HYBRID_INVOICE_PROMPT_DE;
  }
  return [
    HYBRID_INVOICE_EN_HEADER,
    INVOICE_EN_DATE_RULES,
    INVOICE_EN_CURRENCY_RULES,
    INVOICE_EN_ODOMETER_RULES,
    INVOICE_EN_TABLE_RULES,
    "Use the same JSON schema as German invoices (line_items with description, quantity, unit_price, total_price).",
  ].join("\n\n");
}

export function buildInvoiceVisionSystemPrompt(locale: AppLocale = "de"): string {
  const base = buildInvoiceVisionSystemPromptDe();
  if (locale === "de") {
    return base;
  }
  return `${base}\n\n${EN_INVOICE_VISION_APPENDIX}`;
}

export function buildInvoiceHeaderSystemPrompt(locale: AppLocale = "de"): string {
  const base = buildInvoiceHeaderSystemPromptDe();
  if (locale === "de") {
    return base;
  }
  return [
    "Extract ONLY the invoice header from a US/UK automotive repair invoice.",
    "Fields: vendor, invoiceNumber, date (ISO YYYY-MM-DD), mileageKm (integer km, convert from miles if needed).",
    INVOICE_EN_DATE_RULES,
    INVOICE_EN_ODOMETER_RULES,
    INVOICE_EN_CURRENCY_RULES,
  ].join("\n\n");
}

export function buildInvoiceOverviewSystemPrompt(locale: AppLocale = "de"): string {
  if (locale === "de") {
    return buildInvoiceVisionSystemPromptDe();
  }
  return buildInvoiceVisionSystemPrompt("en");
}

export function buildInvoiceSystemPrompt(locale: AppLocale = "de"): string {
  const base = buildInvoiceSystemPromptDe();
  if (locale === "de") {
    return base;
  }
  return `${base}\n\n${EN_INVOICE_VISION_APPENDIX}`;
}
