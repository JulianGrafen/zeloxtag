import { describe, expect, it } from "vitest";

import {
  parseGermanNumber,
  preferLineTotalAmount,
  processLineItems,
} from "@/utils/invoiceMath";

describe("parseGermanNumber", () => {
  it("parses German comma decimals", () => {
    expect(parseGermanNumber("141,46")).toBe(141.46);
    expect(parseGermanNumber("42,90")).toBe(42.9);
  });

  it("parses thousands dot + decimal comma", () => {
    expect(parseGermanNumber("1.234,56")).toBe(1234.56);
  });

  it("passes through numbers", () => {
    expect(parseGermanNumber(120)).toBe(120);
  });

  it("strips currency and units", () => {
    expect(parseGermanNumber("  141,46 €  ")).toBe(141.46);
    expect(parseGermanNumber("7,00 Liter")).toBe(7);
  });

  it("returns null for empty input", () => {
    expect(parseGermanNumber(null)).toBeNull();
    expect(parseGermanNumber("")).toBeNull();
    expect(parseGermanNumber(undefined)).toBeNull();
  });
});

describe("processLineItems", () => {
  it("computes total when gesamtpreis is absent", () => {
    const [item] = processLineItems([
      { label: "Reifen", menge: "4", einzelpreis: "120,00", gesamtpreis: null },
    ]);
    expect(item).toMatchObject({ menge: 4, einzelpreis: 120, gesamtpreis: 480 });
  });

  it("defaults menge to 1 when blank and only E-Preis exists", () => {
    const [item] = processLineItems([
      { label: "Ölfilter", menge: null, einzelpreis: "42,90", gesamtpreis: null },
    ]);
    expect(item).toMatchObject({ menge: 1, einzelpreis: 42.9, gesamtpreis: 42.9 });
  });

  it("CRITICAL: does NOT overwrite Ges. Preis with E-Preis when Menge is blank", () => {
    // LLM often leaves Menge null but copies both EP and GP correctly.
    const [item] = processLineItems([
      {
        label: "Bremsscheibe PRO+",
        menge: null,
        einzelpreis: "165,99 €",
        gesamtpreis: "331,98 €",
      },
    ]);
    expect(item.gesamtpreis).toBe(331.98);
  });

  it("overrides wrong gesamtpreis when Menge and E-Preis are both known", () => {
    const [item] = processLineItems([
      { label: "Reifen", menge: "4", einzelpreis: "120,00", gesamtpreis: "120,00" },
    ]);
    expect(item.gesamtpreis).toBe(480);
  });

  it("uses gesamtpreis when einzelpreis is missing (no menge×GP doubling)", () => {
    const [item] = processLineItems([
      { label: "Arbeitslohn", menge: "2", einzelpreis: null, gesamtpreis: "95,00" },
    ]);
    expect(item.gesamtpreis).toBe(95);
  });

  it("keeps matching gesamtpreis within tolerance", () => {
    const [item] = processLineItems([
      { label: "Pauschale", menge: "3", einzelpreis: "33,33", gesamtpreis: "100,00" },
    ]);
    expect(item.gesamtpreis).toBe(100);
  });

  it("blank Menge + blank Ges. Preis + E-Preis → total = E-Preis", () => {
    const [item] = processLineItems([
      {
        label: "Bremsbeläge erneuern (Hinterachse)",
        menge: null,
        einzelpreis: "90,00 €",
        gesamtpreis: null,
      },
    ]);
    expect(item.gesamtpreis).toBe(90);
  });
});

describe("preferLineTotalAmount", () => {
  it("prefers Ges. Preis over E-Preis when one is a multiple", () => {
    expect(preferLineTotalAmount(165.99, 331.98)).toBe(331.98);
    expect(preferLineTotalAmount(331.98, 165.99)).toBe(331.98);
  });

  it("keeps equal amounts", () => {
    expect(preferLineTotalAmount(90, 90)).toBe(90);
  });
});
