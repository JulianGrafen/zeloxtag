import { describe, expect, it, vi } from "vitest";

import {
  mapWithConcurrency,
  mergeAnalyzeDocumentFields,
  resolveOcrMaxParallelPages,
  type AnalyzeDocumentResult,
} from "@/lib/ocr/analyze-document-client";
import type { InvoiceTextParseResult } from "@/lib/ocr/text-parse-schema";

function buildResult(
  index: number,
  overrides: Partial<InvoiceTextParseResult> = {},
): AnalyzeDocumentResult {
  return {
    kind: "invoice",
    documentType: "invoice",
    fields: {
      vendor: `Vendor ${index}`,
      date: "2026-01-15",
      amount: 100 + index,
      category: "service",
      summary: `Page ${index}`,
      lineItems: [{ label: `Item ${index}`, amount: 50 + index }],
      kbaNumber: null,
      vehicleApprovals: null,
      authority: null,
      conditions: null,
      partCategory: null,
      notes: null,
      manufacturer: null,
      invoiceNumber: null,
      mileageKm: null,
      ...overrides,
    },
    approvalFields: null,
    rawText: `raw ${index}`,
    modelId: "test",
  };
}

describe("resolveOcrMaxParallelPages", () => {
  it("defaults to 2", () => {
    expect(resolveOcrMaxParallelPages()).toBe(2);
  });
});

describe("mapWithConcurrency", () => {
  it("preserves result order regardless of completion time", async () => {
    const delays = [30, 10, 20];
    const results = await mapWithConcurrency(
      delays,
      2,
      async (delay, index) => {
        await new Promise((resolve) => setTimeout(resolve, delay));
        return index;
      },
    );

    expect(results).toEqual([0, 1, 2]);
  });

  it("respects concurrency cap", async () => {
    let inFlight = 0;
    let maxInFlight = 0;

    await mapWithConcurrency(
      [1, 2, 3, 4],
      2,
      async () => {
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await new Promise((resolve) => setTimeout(resolve, 20));
        inFlight -= 1;
        return null;
      },
    );

    expect(maxInFlight).toBeLessThanOrEqual(2);
  });

  it("reports progress as items complete", async () => {
    const onComplete = vi.fn();

    await mapWithConcurrency(
      [1, 2, 3],
      2,
      async (value) => value,
      onComplete,
    );

    expect(onComplete).toHaveBeenCalledWith(1, 3);
    expect(onComplete).toHaveBeenCalledWith(2, 3);
    expect(onComplete).toHaveBeenCalledWith(3, 3);
  });

  it("returns empty array for empty input", async () => {
    await expect(mapWithConcurrency([], 2, async () => 1)).resolves.toEqual([]);
  });
});

describe("mergeAnalyzeDocumentFields", () => {
  it("merges line items in page order", () => {
    const merged = mergeAnalyzeDocumentFields([
      buildResult(1, {
        lineItems: [{ label: "Page 1 item", amount: 10 }],
      }),
      buildResult(2, {
        lineItems: [{ label: "Page 2 item", amount: 20 }],
      }),
    ]);

    expect(merged.lineItems).toEqual([
      { label: "Page 1 item", amount: 10 },
      { label: "Page 2 item", amount: 20 },
    ]);
  });

  it("uses first page with vendor and max amount across pages", () => {
    const merged = mergeAnalyzeDocumentFields([
      buildResult(1, { vendor: null, amount: 200 }),
      buildResult(2, { vendor: "Werkstatt Süd", amount: 150 }),
    ]);

    expect(merged.vendor).toBe("Werkstatt Süd");
    expect(merged.amount).toBe(200);
  });
});
