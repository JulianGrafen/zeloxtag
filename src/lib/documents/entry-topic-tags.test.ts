import { describe, expect, it } from "vitest";

import { applyClientEntryPresentationFallback } from "@/lib/documents/entry-topic-presentation-fallback";
import {
  buildFallbackEntryPresentationTitle,
  inferTopicTagsFromLineItems,
  normalizeTopicTags,
  parseTopicTagsFromPartCategory,
  serializeTopicTags,
} from "@/lib/documents/entry-topic-tags";

describe("entry-topic-tags", () => {
  it("serializes and parses topic tags from part_category", () => {
    const serialized = serializeTopicTags(["reifen", "fahrwerk"]);
    expect(serialized).toBe("Reifen, Fahrwerk");
    expect(parseTopicTagsFromPartCategory(serialized)).toEqual([
      "reifen",
      "fahrwerk",
    ]);
  });

  it("infers reifen and fahrwerk from line items", () => {
    const tags = inferTopicTagsFromLineItems([
      { label: "4x Reifen 225/45 R17", amount: 480 },
      { label: "KW V3 Gewindefahrwerk Einbau", amount: 340 },
      { label: "DSG Software Optimierung", amount: 890 },
    ]);
    expect(tags).toContain("reifen");
    expect(tags).toContain("fahrwerk");
    expect(tags).toContain("getriebe");
  });

  it("builds tuning-style fallback title", () => {
    const title = buildFallbackEntryPresentationTitle({
      reviewCategory: "tuning",
      topicTags: ["fahrwerk", "reifen", "getriebe"],
      lineItems: [{ label: "DSG Optimierung", amount: 400 }],
    });
    expect(title.startsWith("Tuning:")).toBe(true);
    expect(title).toMatch(/Fahrwerk/);
    expect(title).toMatch(/Reifen/);
  });

  it("applyClientEntryPresentationFallback fills summary and tags", () => {
    const result = applyClientEntryPresentationFallback({
      vendor: "M&M Performance",
      date: "2024-03-15",
      amount: 4007,
      category: "tuning",
      summary: null,
      topicTags: [],
      lineItems: [
        { label: "Sportfedern H&R", amount: 420 },
        { label: "Reifenwechsel", amount: 96 },
      ],
      kbaNumber: null,
      vehicleApprovals: null,
      authority: null,
      conditions: null,
      partCategory: null,
      notes: null,
      manufacturer: null,
      invoiceNumber: null,
      mileageKm: 1231414,
    });

    expect(result.topicTags ?? []).not.toHaveLength(0);
    expect(result.summary?.trim().length).toBeGreaterThan(2);
  });

  it("normalizeTopicTags accepts German labels", () => {
    expect(normalizeTopicTags(["Reifen", "fahrwerk", "invalid"])).toEqual([
      "reifen",
      "fahrwerk",
    ]);
  });
});
