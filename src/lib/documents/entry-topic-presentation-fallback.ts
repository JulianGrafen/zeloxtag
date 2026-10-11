import {
  buildFallbackEntryPresentationTitle,
  inferTopicTagsFromLineItems,
} from "@/lib/documents/entry-topic-tags";
import {
  normalizeInvoiceReviewCategory,
  type InvoiceReviewCategory,
} from "@/lib/documents/invoice-review-categories";
import {
  normalizeTextParseResult,
  type InvoiceTextParseResult,
} from "@/lib/ocr/text-parse-schema";

/** Client-side fallback when multi-page merge skips server presentation enrichment. */
export function applyClientEntryPresentationFallback(
  fields: InvoiceTextParseResult,
  options: { rawText?: string | null } = {},
): InvoiceTextParseResult {
  const reviewCategory = normalizeInvoiceReviewCategory(
    fields.category as InvoiceReviewCategory,
    "service",
  );
  const topicTags =
    (fields.topicTags?.length ?? 0) > 0
      ? fields.topicTags ?? []
      : inferTopicTagsFromLineItems(fields.lineItems);
  const summary =
    fields.summary?.trim() ||
    buildFallbackEntryPresentationTitle({
      reviewCategory,
      topicTags,
      lineItems: fields.lineItems,
      vendor: fields.vendor,
      rawCategory: fields.category,
      rawText: options.rawText,
    });

  return normalizeTextParseResult({
    ...fields,
    topicTags,
    summary,
  });
}
