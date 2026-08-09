import { describe, expect, it } from "vitest";

import {
  BLOTZHEIM_EXPECTED_TOTALS,
  BLOTZHEIM_LINE_ITEMS_SUM,
  BLOTZHEIM_LLM_HALLUCINATED_LINE_ITEMS,
  BLOTZHEIM_LLM_RAW_LINE_ITEMS,
} from "@/lib/ocr/fixtures/blotzheim-invoice-line-items";
import { parseLlmRawLineItems } from "@/lib/ocr/invoice-line-item-math";
import { processLineItems } from "@/utils/invoiceMath";

describe("Blotzheim Rechnung 27646 — Extract & Compute golden fixture", () => {
  it("produces correct Ges. Preis for all 20 positions from raw LLM strings", () => {
    const processed = processLineItems(BLOTZHEIM_LLM_RAW_LINE_ITEMS);

    expect(processed).toHaveLength(20);

    for (let i = 0; i < BLOTZHEIM_EXPECTED_TOTALS.length; i += 1) {
      const expected = BLOTZHEIM_EXPECTED_TOTALS[i]!;
      const actual = processed[i]!;
      expect(actual.label).toContain(expected.label.split(" ")[0]!);
      expect(actual.gesamtpreis).toBeCloseTo(expected.amount, 2);
    }
  });

  it("maps to InvoiceLineItem amounts used for save/merge", () => {
    const lineItems = parseLlmRawLineItems(BLOTZHEIM_LLM_RAW_LINE_ITEMS);
    expect(lineItems).not.toBeNull();
    expect(lineItems!).toHaveLength(19);

    const billable = BLOTZHEIM_EXPECTED_TOTALS.filter((row) => row.amount > 0);
    for (let i = 0; i < billable.length; i += 1) {
      expect(lineItems![i]!.amount).toBeCloseTo(billable[i]!.amount, 2);
    }

    const sum = lineItems!.reduce((acc, item) => acc + item.amount, 0);
    expect(sum).toBeCloseTo(BLOTZHEIM_LINE_ITEMS_SUM, 2);
  });

  it("E-Preis-only row without Menge/Ges. Preis is excluded from totals", () => {
    const [item] = processLineItems([
      {
        label: "Bremsbeläge erneuern (Hinterachse)",
        menge: null,
        einzelpreis: "90,00 €",
        gesamtpreis: null,
      },
    ]);
    expect(item.gesamtpreis).toBe(0);
  });

  it("fractional labor hours: 0,90 × 90,00 = 81,00", () => {
    const [item] = processLineItems([
      {
        label: "Beide Bremsscheiben erneuern (Hinterachse)",
        menge: "0,90",
        einzelpreis: "90,00 €",
        gesamtpreis: "81,00 €",
      },
    ]);
    expect(item.gesamtpreis).toBe(81);
  });

  it("Liter quantity: 7,00 Liter × 13,45 = 94,15", () => {
    const [item] = processLineItems([
      {
        label: "Motoröl 5W30",
        menge: "7,00 Liter",
        einzelpreis: "13,45 €",
        gesamtpreis: "94,15 €",
      },
    ]);
    expect(item).toMatchObject({ menge: 7, einzelpreis: 13.45, gesamtpreis: 94.15 });
  });

  it("corrects LLM EP→GP hallucinations on multi-qty rows", () => {
    const processed = processLineItems(BLOTZHEIM_LLM_HALLUCINATED_LINE_ITEMS);
    expect(processed.find((i) => i.label.includes("Bremsscheibe"))!.gesamtpreis).toBe(
      331.98,
    );
    expect(
      processed.find((i) => i.label.includes("Ventildeckeldichtung"))!.gesamtpreis,
    ).toBe(360);
    expect(processed.find((i) => i.label.includes("Motoröl 5W30"))!.gesamtpreis).toBe(
      94.15,
    );
    expect(
      processed.find((i) => i.label.includes("Bremsbeläge erneuern"))!.gesamtpreis,
    ).toBe(0);
  });
});
