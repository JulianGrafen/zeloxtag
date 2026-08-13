import { describe, expect, it } from "vitest";

import {
  BLOTZHEIM_27327_OCR_TEXT,
  BLOTZHEIM_27327_POSITIONS,
} from "@/lib/ocr/fixtures/blotzheim-27327-invoice";
import { finalizeColumnFormatLineItems } from "@/lib/ocr/invoice-column-pipeline";

describe("finalizeColumnFormatLineItems", () => {
  it("trusts layout rows when they reconcile with Nettosumme", () => {
    const shiftedLlm = [
      { label: "AGR-Ventil", amount: 54 },
      { label: "Abgasrückführungsventil erneuern", amount: 130.8 },
      { label: "Winterräder montiert", amount: 218.88 },
    ];

    const result = finalizeColumnFormatLineItems({
      llmItems: shiftedLlm,
      layoutItems: [...BLOTZHEIM_27327_POSITIONS],
      ocrText: BLOTZHEIM_27327_OCR_TEXT,
      grossAmount: 348.53,
    });

    expect(result.lineItems).toEqual([
      ...BLOTZHEIM_27327_POSITIONS,
      { label: "MwSt (19 % (A))", amount: 55.65 },
    ]);
    expect(result.amount).toBe(348.53);
    expect(
      result.lineItems!.reduce((sum, item) => sum + item.amount, 0),
    ).toBeCloseTo(348.53, 2);
  });
});
