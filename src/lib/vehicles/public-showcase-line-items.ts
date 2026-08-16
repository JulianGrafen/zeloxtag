import { shouldIncludeInvoiceLine } from "@/lib/documents/invoice-line-filters";
import { parseLineItems } from "@/lib/documents/line-items";
import type { Document, DocumentLineItem } from "@/types/database";

export type ShowcaseLineItemOption = {
  index: number;
  label: string;
};

export function listShowcaseLineItemOptions(
  items: DocumentLineItem[] | null | undefined,
): ShowcaseLineItemOption[] {
  if (!items?.length) return [];

  const options: ShowcaseLineItemOption[] = [];
  for (const [index, item] of items.entries()) {
    if (!shouldIncludeInvoiceLine(item.label)) continue;
    options.push({ index, label: item.label.trim() });
  }
  return options;
}

export function showcaseLineItemsFromDocument(
  doc: Document,
): ShowcaseLineItemOption[] {
  return listShowcaseLineItemOptions(parseLineItems(doc.line_items));
}

export function hasExplicitShowcaseLineSelection(
  items: readonly DocumentLineItem[],
): boolean {
  return items.some(
    (item) =>
      shouldIncludeInvoiceLine(item.label) &&
      typeof item.showOnPublicShowcase === "boolean",
  );
}

/**
 * Eligible positions for the public list.
 * Legacy rows without flags stay fully visible; once any flag is set, only `true` shows.
 */
export function visibleShowcaseLineItems(
  items: readonly DocumentLineItem[],
  respectSelection: boolean,
): DocumentLineItem[] {
  const eligible = items.filter((item) => shouldIncludeInvoiceLine(item.label));
  if (!respectSelection || !hasExplicitShowcaseLineSelection(eligible)) {
    return eligible;
  }
  return eligible.filter((item) => item.showOnPublicShowcase === true);
}

/** Indexes to pre-check in settings (all eligible when never configured). */
export function selectedShowcaseLineIndexes(
  items: readonly DocumentLineItem[],
): number[] {
  const selected: number[] = [];
  const eligible: number[] = [];
  let hasExplicit = false;

  for (const [index, item] of items.entries()) {
    if (!shouldIncludeInvoiceLine(item.label)) continue;
    eligible.push(index);
    if (typeof item.showOnPublicShowcase === "boolean") {
      hasExplicit = true;
      if (item.showOnPublicShowcase) selected.push(index);
    }
  }

  return hasExplicit ? selected : eligible;
}

export function withShowcaseLineSelection(
  items: readonly DocumentLineItem[],
  selectedIndexes: ReadonlySet<number>,
): DocumentLineItem[] {
  return items.map((item, index) => ({
    ...item,
    showOnPublicShowcase: selectedIndexes.has(index),
  }));
}

export function parseShowcaseLineSelections(
  raw: unknown,
): Record<string, number[]> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};

  const out: Record<string, number[]> = {};
  for (const [documentId, value] of Object.entries(raw)) {
    const id = documentId.trim();
    if (!id || !Array.isArray(value)) continue;

    const indexes = [
      ...new Set(
        value.filter(
          (index): index is number =>
            typeof index === "number" &&
            Number.isInteger(index) &&
            index >= 0 &&
            index < 40,
        ),
      ),
    ].sort((a, b) => a - b);

    out[id] = indexes;
  }
  return out;
}
