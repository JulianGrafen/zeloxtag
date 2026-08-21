import { describe, expect, it } from "vitest";

import {
  billableInvoiceLineItems,
  isThinInvoiceExtraction,
} from "@/lib/documents/invoice-extraction-thin";

describe("isThinInvoiceExtraction", () => {
  it("treats missing line items as thin", () => {
    expect(isThinInvoiceExtraction({ lineItems: null })).toBe(true);
    expect(isThinInvoiceExtraction({ lineItems: [] })).toBe(true);
  });

  it("accepts two or more billable positions", () => {
    expect(
      isThinInvoiceExtraction({
        lineItems: [
          { label: "Inspektion", amount: 120 },
          { label: "Ölwechsel", amount: 89 },
        ],
      }),
    ).toBe(false);
  });

  it("flags a single row that equals the invoice total", () => {
    expect(
      isThinInvoiceExtraction({
        lineItems: [{ label: "Werkstatt", amount: 540.84 }],
        amount: 540.84,
      }),
    ).toBe(true);
  });

  it("accepts one genuine detail line without total match", () => {
    expect(
      isThinInvoiceExtraction({
        lineItems: [{ label: "Bremsbeläge vorne", amount: 149.5 }],
        amount: 540.84,
      }),
    ).toBe(false);
  });

  it("ignores MwSt. when counting billable rows", () => {
    expect(
      billableInvoiceLineItems([
        { label: "Service", amount: 100 },
        { label: "MwSt 19%", amount: 19 },
      ]),
    ).toHaveLength(1);
  });
});
