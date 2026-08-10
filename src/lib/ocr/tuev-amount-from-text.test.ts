import { describe, expect, it } from "vitest";

import { extractTuevAmountFromText, preferTuevTotalAmount } from "@/lib/ocr/tuev-amount-from-text";

describe("extractTuevAmountFromText", () => {
  it("reads TÜV Rheinland Entgeltinformation Gesamt", () => {
    const text = `
Entgeltinformation
Prüfungsentgelt                    165,71
Vorgaben                             1,19
Vergütung                            5,00
Gesamt: 171,90 inkl. USt.
    `.trim();

    expect(extractTuevAmountFromText(text)).toBe(171.9);
  });

  it("reads DEKRA Gesamtbetrag inkl. MwSt", () => {
    const text = `
Hauptuntersuchung                  123,81
Sonstiges                            1,19
Gesamtbetrag inkl. MwSt: 125,00 EUR
    `.trim();

    expect(extractTuevAmountFromText(text)).toBe(125);
  });

  it("sums partial fee rows when no Gesamt label is present", () => {
    const text = `
Hauptuntersuchung                  123,81
Vorgaben                             1,19
    `.trim();

    expect(extractTuevAmountFromText(text)).toBe(125);
  });
});

describe("preferTuevTotalAmount", () => {
  it("prefers OCR Gesamt when LLM returned partial HU fee", () => {
    expect(
      preferTuevTotalAmount(
        123.81,
        [{ label: "Hauptuntersuchung", amount: 123.81 }],
        "Gesamtbetrag inkl. MwSt: 125,00 EUR",
      ),
    ).toBe(125);
  });
});
