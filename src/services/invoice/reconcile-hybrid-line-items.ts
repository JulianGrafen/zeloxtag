import { normalizedInvoiceLineLabelKey } from "@/lib/ocr/invoice-line-item-dedupe";
import { finalizeColumnFormatLineItems } from "@/lib/ocr/invoice-column-pipeline";
import { extractInvoiceLineItemsFromAzureLayout } from "@/lib/ocr/invoice-line-items-from-layout";
import type { InvoiceLineItem as UiLineItem } from "@/lib/ocr/text-parse-schema";
import type { AzureLayoutAnalyzeResult } from "@/lib/ocr/azure-document-intelligence";
import type { InvoiceLineItem, InvoiceLineItemDraft } from "@/types/invoice";

import { validateAndFixLineItems } from "./InvoiceMathValidator";

function labelMatchScore(a: string, b: string): number {
  const keyA = normalizedInvoiceLineLabelKey(a);
  const keyB = normalizedInvoiceLineLabelKey(b);
  if (!keyA || !keyB) return 0;
  if (keyA === keyB) return 100;
  if (keyA.includes(keyB) || keyB.includes(keyA)) return 80;

  const wordsA = new Set(keyA.split(" ").filter((word) => word.length >= 3));
  const wordsB = keyB.split(" ").filter((word) => word.length >= 3);
  const overlap = wordsB.filter((word) => wordsA.has(word)).length;
  if (overlap >= 2) return 60;
  if (overlap === 1) return 35;
  return 0;
}

function findDraftMatch(
  label: string,
  draftByIndex: InvoiceLineItem[],
  usedDraftIndexes: Set<number>,
): InvoiceLineItem | null {
  let best: InvoiceLineItem | null = null;
  let bestScore = 0;
  let bestIndex = -1;

  for (let index = 0; index < draftByIndex.length; index += 1) {
    if (usedDraftIndexes.has(index)) continue;
    const draft = draftByIndex[index]!;
    const score = labelMatchScore(label, draft.description);
    if (score > bestScore) {
      bestScore = score;
      best = draft;
      bestIndex = index;
    }
  }

  if (!best || bestScore < 35) return null;
  usedDraftIndexes.add(bestIndex);
  return best;
}

function mapCorrectedRowsToInvoiceLineItems(
  corrected: UiLineItem[],
  draftValidated: InvoiceLineItem[],
): InvoiceLineItem[] {
  const usedDraftIndexes = new Set<number>();

  return validateAndFixLineItems(
    corrected.map((row, index) => {
      const draft =
        findDraftMatch(row.label, draftValidated, usedDraftIndexes) ??
        draftValidated[index] ??
        null;

      return {
        description: row.label,
        quantity: draft?.quantity ?? 1,
        unit_price: draft?.unit_price ?? null,
        total_price: row.amount,
      } satisfies InvoiceLineItemDraft;
    }),
  );
}

/**
 * Applies the shared column pipeline (layout trust, Pos OCR reconcile, realign)
 * to hybrid LLM line items — same correction path as the wizard / vision flow.
 *
 * @param netAmount - LLM-extracted Nettosumme; used as layout-trust hint when
 *   Nettosumme is on a later page and not found in the OCR text directly.
 */
export function reconcileHybridInvoiceLineItems(options: {
  draftItems: InvoiceLineItemDraft[];
  markdown: string;
  layout: AzureLayoutAnalyzeResult | null;
  grossAmount: number | null;
  netAmount?: number | null;
}): InvoiceLineItem[] {
  const draftValidated = validateAndFixLineItems(options.draftItems);

  const llmItems: UiLineItem[] = draftValidated.map((item) => ({
    label: item.description,
    amount: item.total_price,
  }));

  const layoutItems = options.layout
    ? extractInvoiceLineItemsFromAzureLayout(options.layout)
    : null;

  const { lineItems: corrected } = finalizeColumnFormatLineItems({
    llmItems,
    layoutItems,
    ocrText: options.markdown,
    grossAmount: options.grossAmount,
    hintNetAmount: options.netAmount,
  });

  if (!corrected?.length) {
    return draftValidated;
  }

  return mapCorrectedRowsToInvoiceLineItems(corrected, draftValidated);
}
