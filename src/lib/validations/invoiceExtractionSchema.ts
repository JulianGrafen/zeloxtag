import { z } from "zod";

import type { LlmRawLineItem } from "@/lib/validations/invoiceSchemas";

/** Vision LLM row — English schema (preferred). */
export interface InvoiceExtractionLineItem {
  description: string;
  quantity: string | null;
  unit_price: string | null;
  total_price: string | null;
}

/** Vision LLM document payload — English schema (preferred). */
export interface InvoiceExtraction {
  line_items: InvoiceExtractionLineItem[];
  total_amount: string | null;
}

const nullableString = z.union([z.string(), z.null()]).optional();

export const visionLineItemSchema = z.object({
  description: z.string().min(1).optional(),
  label: z.string().min(1).optional(),
  quantity: nullableString,
  menge: nullableString,
  unit_price: nullableString,
  einzelpreis: nullableString,
  total_price: nullableString,
  gesamtpreis: nullableString,
});

function coerceNullableString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Map English or legacy German vision fields → processLineItems input. */
export function normalizeVisionLineItemRow(row: unknown): LlmRawLineItem | null {
  const parsed = visionLineItemSchema.safeParse(row);
  if (!parsed.success) return null;

  const item = parsed.data;
  const label = (item.description ?? item.label ?? "").trim();
  if (!label) return null;

  return {
    label,
    menge: coerceNullableString(item.quantity ?? item.menge),
    einzelpreis: coerceNullableString(item.unit_price ?? item.einzelpreis),
    gesamtpreis: coerceNullableString(item.total_price ?? item.gesamtpreis),
  };
}

/** Accept `line_items` (new) or `lineItems` (legacy) from vision JSON. */
export function normalizeVisionLineItemsPayload(
  record: Record<string, unknown>,
): LlmRawLineItem[] {
  const raw = record.line_items ?? record.lineItems;
  if (!Array.isArray(raw)) return [];

  return raw
    .map((row) => normalizeVisionLineItemRow(row))
    .filter((row): row is LlmRawLineItem => row !== null);
}

/** Read brutto total from vision JSON (`total_amount` or legacy `amount`). */
export function readVisionTotalAmountRaw(
  record: Record<string, unknown>,
): unknown {
  return record.total_amount ?? record.amount ?? null;
}
