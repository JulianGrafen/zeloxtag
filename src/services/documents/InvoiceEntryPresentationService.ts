import "server-only";

import { z } from "zod";

import {
  buildFallbackEntryPresentationTitle,
  ENTRY_TOPIC_TAGS,
  inferTopicTagsFromLineItems,
  normalizeTopicTags,
  sanitizePresentationTitle,
  type EntryTopicTag,
} from "@/lib/documents/entry-topic-tags";
import {
  normalizeInvoiceReviewCategory,
  type InvoiceReviewCategory,
} from "@/lib/documents/invoice-review-categories";
import { extractJsonObject } from "@/lib/ocr/json-from-llm";
import { getOcrLlmClient } from "@/lib/ocr/llm-client";
import { resolveInvoiceParseModel } from "@/lib/ocr/model-routing";
import type { DocumentLineItem } from "@/types/database";

const presentationSchema = z.object({
  title: z.string().trim().min(2).max(160),
  topicTags: z.array(z.enum(ENTRY_TOPIC_TAGS)).max(5),
});

export type InvoiceEntryPresentation = {
  title: string;
  topicTags: EntryTopicTag[];
};

export type InvoiceEntryPresentationInput = {
  lineItems: DocumentLineItem[] | null | undefined;
  vendor?: string | null;
  rawText?: string | null;
  reviewCategory?: string | null;
  vehicleMake?: string | null;
  vehicleModel?: string | null;
};

const PRESENTATION_JSON_SCHEMA = {
  name: "invoice_entry_presentation",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["title", "topicTags"],
    properties: {
      title: {
        type: "string",
        description:
          "German dashboard title, max ~12 words. Format: '{Service|Reparatur|Tuning}: {themes}, {specific work}'. Example: 'Tuning: Fahrwerk, Reifen, DSG-Optimierung'. No workshop name alone.",
      },
      topicTags: {
        type: "array",
        maxItems: 5,
        items: {
          type: "string",
          enum: [...ENTRY_TOPIC_TAGS],
        },
        description:
          "Distinct topic tags inferred from line items only. Use getriebe only if DSG/Getriebe appears. No invented parts.",
      },
    },
  },
} as const;

function buildUserPrompt(input: InvoiceEntryPresentationInput): string {
  const category = normalizeInvoiceReviewCategory(
    input.reviewCategory as InvoiceReviewCategory | undefined,
    "service",
  );
  const items = (input.lineItems ?? [])
    .slice(0, 40)
    .map((item) => `- ${item.label}: ${item.amount} EUR`)
    .join("\n");
  const vehicle = [input.vehicleMake, input.vehicleModel]
    .filter(Boolean)
    .join(" ");
  const textSnippet = (input.rawText ?? "").replace(/\s+/g, " ").trim().slice(0, 2_500);

  return [
    `Review category: ${category}`,
    vehicle ? `Vehicle: ${vehicle}` : null,
    input.vendor?.trim() ? `Workshop: ${input.vendor.trim()}` : null,
    "Line items:",
    items || "(none)",
    textSnippet ? `OCR excerpt:\n${textSnippet}` : null,
  ]
    .filter(Boolean)
    .join("\n\n");
}

function buildFallbackPresentation(
  input: InvoiceEntryPresentationInput,
): InvoiceEntryPresentation {
  const reviewCategory = normalizeInvoiceReviewCategory(
    input.reviewCategory as InvoiceReviewCategory | undefined,
    "service",
  );
  const topicTags = inferTopicTagsFromLineItems(input.lineItems);
  const title = buildFallbackEntryPresentationTitle({
    reviewCategory,
    topicTags,
    lineItems: input.lineItems,
    vendor: input.vendor,
    rawText: input.rawText,
  });
  return { title, topicTags };
}

export async function enrichInvoiceEntryPresentation(
  input: InvoiceEntryPresentationInput,
): Promise<InvoiceEntryPresentation> {
  const fallback = buildFallbackPresentation(input);

  try {
    const { client, model } = getOcrLlmClient({
      model: resolveInvoiceParseModel(),
    });

    const completion = await client.chat.completions.create({
      model,
      max_completion_tokens: 400,
      response_format: {
        type: "json_schema",
        json_schema: PRESENTATION_JSON_SCHEMA,
      },
      messages: [
        {
          role: "system",
          content:
            "You label German automotive workshop invoices for a vehicle history app. " +
            "Return JSON only. Title must be concise German. topicTags must be from the allowed enum only. " +
            "Never invent parts not supported by line items or OCR excerpt.",
        },
        { role: "user", content: buildUserPrompt(input) },
      ],
    });

    const content = completion.choices[0]?.message?.content;
    if (!content?.trim()) {
      return fallback;
    }

    const parsed = presentationSchema.safeParse(extractJsonObject(content));
    if (!parsed.success) {
      return fallback;
    }

    const title =
      sanitizePresentationTitle(parsed.data.title) ?? fallback.title;
    const topicTags = normalizeTopicTags(parsed.data.topicTags);
    const mergedTags =
      topicTags.length > 0 ? topicTags : fallback.topicTags;

    return {
      title,
      topicTags: mergedTags,
    };
  } catch {
    return fallback;
  }
}

export function mergePresentationIntoParseFields<
  T extends { summary: string | null; topicTags?: EntryTopicTag[] },
>(fields: T, presentation: InvoiceEntryPresentation): T {
  return {
    ...fields,
    summary: presentation.title,
    topicTags: presentation.topicTags,
  };
}
