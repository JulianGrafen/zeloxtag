import { describe, expect, it } from "vitest";

import {
  buildInvoiceDashboardTitle,
  isPrimaryOilChange,
} from "@/lib/documents/invoice-title";
import { detectOilChangeInvoice } from "@/lib/documents/oil-changes";
import { normalizeDocumentDateIso } from "@/lib/documents/format";

const QA_LINE_ITEMS = [
  { label: "Inspektion inkl. Arbeitslohn", amount: 120 },
  { label: "Motoröl Castrol Edge 5W-30 6,5 l", amount: 139.75 },
  { label: "Ölfilter Original BMW", amount: 18.9 },
  { label: "Luftfilter Original BMW", amount: 29.95 },
  { label: "MwSt 19 %", amount: 58.63 },
];

describe("QA-ZT-2026-001 mixed Inspektion invoice", () => {
  const oil = detectOilChangeInvoice({
    category: "service",
    lineItems: QA_LINE_ITEMS,
    vendor: "ZeloxTag QA Werkstatt",
  });

  it("detects oil as side work, not primary job", () => {
    expect(oil.isOilChange).toBe(true);
    expect(
      isPrimaryOilChange({
        category: "service",
        lineItems: QA_LINE_ITEMS,
        oil,
      }),
    ).toBe(false);
  });

  it("titles from Inspektion, not Ölwechsel", () => {
    const title = buildInvoiceDashboardTitle({
      category: "service",
      lineItems: QA_LINE_ITEMS,
      vendor: "ZeloxTag QA Werkstatt",
      oil,
    });
    expect(title.toLowerCase()).toContain("inspektion");
    expect(title.toLowerCase()).not.toMatch(/^ölwechsel\b/);
  });

  it("normalizes German invoice date", () => {
    expect(normalizeDocumentDateIso("22.08.2026")).toBe("2026-08-22");
    expect(normalizeDocumentDateIso("08/22/2026")).toBe("2026-08-22");
  });
});

describe("oil-only invoice", () => {
  const lineItems = [
    { label: "Motoröl Castrol Edge 5W-30 6,5 l", amount: 139.75 },
    { label: "Ölfilter Original BMW", amount: 18.9 },
    { label: "Entsorgung Altöl", amount: 8.5 },
  ];
  const oil = detectOilChangeInvoice({ lineItems, category: "service" });

  it("treats oil-only jobs as primary oil change", () => {
    expect(
      isPrimaryOilChange({ category: "service", lineItems, oil }),
    ).toBe(true);
  });
});
