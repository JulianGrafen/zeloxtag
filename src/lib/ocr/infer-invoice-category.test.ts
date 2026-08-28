import { describe, expect, it } from "vitest";

import { OCR_SAMPLES } from "@/lib/ocr/__fixtures__/ocr-samples";
import {
  inferCategoryFromHeaderKeywords,
  inferInvoiceCategory,
  preferInvoiceCategory,
} from "@/lib/ocr/infer-invoice-category";

describe("inferCategoryFromHeaderKeywords", () => {
  it("detects service from SERVICE-RECHNUNG title line", () => {
    expect(
      inferCategoryFromHeaderKeywords(["SERVICE-RECHNUNG", "Werkstatt Süd"]),
    ).toBe("service");
  });

  it("detects tuning from TUNING RECHNUNG title line", () => {
    expect(
      inferCategoryFromHeaderKeywords(["TUNING RECHNUNG", "BB-Automotive"]),
    ).toBe("tuning");
  });

  it("detects repair from Reparatur-Rechnung title line", () => {
    expect(
      inferCategoryFromHeaderKeywords(["Reparatur-Rechnung", "Kfz Meier"]),
    ).toBe("repair");
  });

  it("detects inspektion as service", () => {
    expect(inferCategoryFromHeaderKeywords(["Inspektion laut Herstellervorgabe"])).toBe(
      "service",
    );
  });

  it("returns null for generic Rechnung without specialty keyword", () => {
    expect(inferCategoryFromHeaderKeywords(["Rechnung RE-2026-0312"])).toBeNull();
  });
});

describe("inferInvoiceCategory with header boost", () => {
  it("classifies tuning invoice with header keyword and line items", () => {
    const text = `
TUNING RECHNUNG
BB-Automotive
Downpipe Edelstahl               480,00 €
Stage 2 Chiptuning               650,00 €
MwSt 19%                         214,60 €
Zahlbetrag                     1.344,60 €
`.trim();

    expect(inferInvoiceCategory(text)).toBe("tuning");
  });

  it("does not classify workshop bill with TÜV mention as tuev", () => {
    expect(inferInvoiceCategory(OCR_SAMPLES.workshopInvoiceWithTuevMention)).not.toBe(
      "tuev",
    );
  });
});

describe("preferInvoiceCategory (vision path simulation)", () => {
  it("promotes other to tuning when body text has tuning signals", () => {
    const text = `
Chiptuning Rechnung
Downpipe + Stage 2 Remap
Arbeitslohn                       320,00 €
MwSt 19%                           60,80 €
Zahlbetrag                        380,80 €
`.trim();

    expect(preferInvoiceCategory("other", text)).toBe("tuning");
  });

  it("promotes other to service for oil-change invoice", () => {
    expect(preferInvoiceCategory("other", OCR_SAMPLES.oilChangeInvoice)).toBe(
      "service",
    );
  });

  it("promotes other to repair for brake repair invoice", () => {
    expect(preferInvoiceCategory("other", OCR_SAMPLES.brakeRepairInvoice)).toBe(
      "repair",
    );
  });

  it("uses header lines for fast service classification", () => {
    const text = `
Pos. Beschreibung                  Betrag
1    Bremsbeläge                   120,00 €
MwSt 19%                            22,80 €
Zahlbetrag                         142,80 €
`.trim();

    expect(
      preferInvoiceCategory("other", text, ["SERVICE-RECHNUNG", "Auto Werkstatt"]),
    ).toBe("service");
  });
});
