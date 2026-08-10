import { describe, expect, it } from "vitest";

import { parseGermanNumber, processLineItems } from "@/utils/invoiceMath";

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

  it("defaults menge to 1 when gesamtpreis is present", () => {
    const [item] = processLineItems([
      { label: "Entsorgung", menge: null, einzelpreis: null, gesamtpreis: "12,00" },
    ]);
    expect(item).toMatchObject({ menge: null, einzelpreis: null, gesamtpreis: 12 });
  });

  it("excludes E-Preis-only rows without Menge and Ges. Preis", () => {
    const [item] = processLineItems([
      { label: "Bremsbeläge erneuern", menge: null, einzelpreis: "90,00", gesamtpreis: null },
    ]);
    expect(item).toMatchObject({ einzelpreis: 90, gesamtpreis: 0 });
  });

  it("overrides wrong gesamtpreis with menge × e-preis", () => {
    const [item] = processLineItems([
      { label: "Reifen", menge: "4,00", einzelpreis: "120,00", gesamtpreis: "120,00" },
    ]);
    expect(item.gesamtpreis).toBe(480);
  });

  it("keeps gesamtpreis when einzelpreis is missing (line total only)", () => {
    const [item] = processLineItems([
      { label: "Arbeitslohn", menge: null, einzelpreis: null, gesamtpreis: "95,00" },
    ]);
    expect(item).toMatchObject({ menge: null, einzelpreis: null, gesamtpreis: 95 });
  });

  it("keeps matching gesamtpreis within tolerance", () => {
    const [item] = processLineItems([
      { label: "Pauschale", menge: "3", einzelpreis: "33,33", gesamtpreis: "100,00" },
    ]);
    expect(item.gesamtpreis).toBe(100);
  });

  it("returns empty array for non-array input", () => {
    expect(processLineItems(null as unknown as [])).toEqual([]);
  });

  it("ignores Pos copied into menge when Ges. Preis matches qty=1", () => {
    const [item] = processLineItems([
      {
        label: "Warnkontakt, Bremsbelagverschleiß",
        menge: "3",
        einzelpreis: "28,80 €",
        gesamtpreis: "28,80 €",
      },
    ]);
    expect(item).toMatchObject({ menge: 1, gesamtpreis: 28.8 });
  });

  it("keeps discounted gesamtpreis when lower than menge × einzelpreis", () => {
    const [item] = processLineItems([
      {
        label: "Sensor, Kühlmitteltemperatur",
        menge: "1 Stück",
        einzelpreis: "41,04 €",
        gesamtpreis: "28,73 €",
      },
    ]);
    expect(item.gesamtpreis).toBe(28.73);
  });
});
