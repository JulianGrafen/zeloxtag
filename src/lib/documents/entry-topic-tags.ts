import type { DocumentLineItem } from "@/types/database";
import { classifySpendBucket, type SpendBucket } from "@/lib/documents/cost-overview";
import {
  normalizeInvoiceReviewCategory,
  type InvoiceReviewCategory,
} from "@/lib/documents/invoice-review-categories";
import { buildInvoiceDashboardTitle } from "@/lib/documents/invoice-title";
import { isInvoiceVatOrTotalLine } from "@/lib/documents/invoice-title";

export const ENTRY_TOPIC_TAGS = [
  "reifen",
  "fahrwerk",
  "motor",
  "getriebe",
  "bremsen",
  "aerodynamik",
  "auspuff",
  "elektrik",
  "service",
  "tuning",
  "sonstiges",
] as const;

export type EntryTopicTag = (typeof ENTRY_TOPIC_TAGS)[number];

export const ENTRY_TOPIC_TAG_LABELS: Record<EntryTopicTag, string> = {
  reifen: "Reifen",
  fahrwerk: "Fahrwerk",
  motor: "Motor",
  getriebe: "Getriebe",
  bremsen: "Bremsen",
  aerodynamik: "Aerodynamik",
  auspuff: "Auspuff",
  elektrik: "Elektrik/ECU",
  service: "Service",
  tuning: "Tuning",
  sonstiges: "Sonstiges",
};

const MAX_TOPIC_TAGS = 5;

const BUCKET_TO_TAGS: Record<SpendBucket, EntryTopicTag[]> = {
  wheels_tires: ["reifen"],
  chassis: ["fahrwerk"],
  body_aero: ["aerodynamik"],
  engine_exhaust: ["motor", "auspuff"],
  electrical_ecu: ["elektrik"],
  other: ["sonstiges"],
};

const EXTRA_LINE_RULES: Array<{ tag: EntryTopicTag; pattern: RegExp }> = [
  { tag: "getriebe", pattern: /\bdsg\b|getriebe|wandler|schaltung/i },
  { tag: "bremsen", pattern: /\bbremse|bremsscheib|bremsbelag/i },
  { tag: "tuning", pattern: /\bchiptuning|stage\s*[1-3]|remap|leistungssteigerung/i },
  { tag: "service", pattern: /\binspektion|wartung|ölwechsel|oelwechsel|hu\b|au\b/i },
];

export function isEntryTopicTag(value: string): value is EntryTopicTag {
  return (ENTRY_TOPIC_TAGS as readonly string[]).includes(value);
}

export function normalizeTopicTags(
  raw: readonly string[] | null | undefined,
): EntryTopicTag[] {
  if (!raw?.length) return [];
  const seen = new Set<EntryTopicTag>();
  const result: EntryTopicTag[] = [];
  for (const item of raw) {
    const key = item.trim().toLowerCase();
    const byLabel = Object.entries(ENTRY_TOPIC_TAG_LABELS).find(
      ([, label]) => label.toLowerCase() === item.trim().toLowerCase(),
    )?.[0] as EntryTopicTag | undefined;
    const tag = isEntryTopicTag(key)
      ? key
      : byLabel && isEntryTopicTag(byLabel)
        ? byLabel
        : null;
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    result.push(tag);
    if (result.length >= MAX_TOPIC_TAGS) break;
  }
  return result;
}

export function topicTagsToLabels(tags: readonly EntryTopicTag[]): string[] {
  return tags.map((tag) => ENTRY_TOPIC_TAG_LABELS[tag]);
}

export function serializeTopicTags(tags: readonly EntryTopicTag[]): string {
  return topicTagsToLabels(tags).join(", ");
}

export function parseTopicTagsFromPartCategory(
  partCategory: string | null | undefined,
): EntryTopicTag[] {
  const raw = partCategory?.trim();
  if (!raw) return [];
  const parts = raw.split(/[,;|·]/).map((part) => part.trim()).filter(Boolean);
  return normalizeTopicTags(parts);
}

export function inferTopicTagsFromLineItems(
  lineItems: DocumentLineItem[] | null | undefined,
): EntryTopicTag[] {
  const seen = new Set<EntryTopicTag>();
  const ordered: EntryTopicTag[] = [];

  const add = (tag: EntryTopicTag) => {
    if (seen.has(tag)) return;
    seen.add(tag);
    ordered.push(tag);
  };

  for (const item of lineItems ?? []) {
    if (isInvoiceVatOrTotalLine(item.label)) continue;
    const bucket = classifySpendBucket(item.label);
    for (const tag of BUCKET_TO_TAGS[bucket]) {
      add(tag);
    }
    for (const rule of EXTRA_LINE_RULES) {
      if (rule.pattern.test(item.label)) {
        add(rule.tag);
      }
    }
    if (ordered.length >= MAX_TOPIC_TAGS) break;
  }

  if (ordered.length === 0) {
    add("sonstiges");
  }

  return ordered.slice(0, MAX_TOPIC_TAGS);
}

const REVIEW_CATEGORY_PREFIX: Record<InvoiceReviewCategory, string> = {
  service: "Service",
  repair: "Reparatur",
  tuning: "Tuning",
};

function shortenDetail(label: string): string {
  return label
    .replace(/^\d+[\).:\s-]+/, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 48);
}

/**
 * Heuristic dashboard title when LLM presentation is unavailable.
 */
export function buildFallbackEntryPresentationTitle(options: {
  reviewCategory: InvoiceReviewCategory;
  topicTags: readonly EntryTopicTag[];
  lineItems?: DocumentLineItem[] | null;
  vendor?: string | null;
  rawCategory?: string | null;
  rawText?: string | null;
}): string {
  const heuristic = buildInvoiceDashboardTitle({
    summary: null,
    vendor: options.vendor,
    category: options.reviewCategory,
    lineItems: options.lineItems,
    rawText: options.rawText,
  });

  const tagLabels = topicTagsToLabels(options.topicTags);
  const prefix = REVIEW_CATEGORY_PREFIX[options.reviewCategory];

  if (tagLabels.length > 0) {
    const mainTags = tagLabels.slice(0, 3).join(", ");
    const leadItem = (options.lineItems ?? []).find(
      (item) => !isInvoiceVatOrTotalLine(item.label),
    );
    const detail = leadItem ? shortenDetail(leadItem.label) : "";
    const tagPartAlreadyInDetail =
      detail.length > 0 &&
      tagLabels.some((label) =>
        detail.toLowerCase().includes(label.toLowerCase()),
      );

    if (detail && !tagPartAlreadyInDetail && detail.length <= 40) {
      return `${prefix}: ${mainTags}, ${detail}`.slice(0, 160);
    }
    return `${prefix}: ${mainTags}`.slice(0, 160);
  }

  if (heuristic.trim().length >= 2) {
    return `${prefix}: ${heuristic}`.slice(0, 160);
  }

  return prefix;
}

export function sanitizePresentationTitle(raw: string | null | undefined): string | null {
  const trimmed = raw?.replace(/\s+/g, " ").trim() ?? "";
  if (trimmed.length < 2) return null;
  return trimmed.slice(0, 160);
}
