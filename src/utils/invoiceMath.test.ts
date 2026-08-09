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

  it("defaults menge to 1", () => {
    const [item] = processLineItems([
      { label: "Ölfilter", menge: null, einzelpreis: "42,90", gesamtpreis: null },
    ]);
    expect(item).toMatchObject({ menge: 1, einzelpreis: 42.9, gesamtpreis: 42.9 });
  });

  it("overrides wrong gesamtpreis with menge × e-preis", () => {
    const [item] = processLineItems([
      { label: "Reifen", menge: "4", einzelpreis: "120,00", gesamtpreis: "120,00" },
    ]);
    expect(item.gesamtpreis).toBe(480);
  });

  it("uses gesamtpreis as e-preis when einzelpreis is missing", () => {
    const [item] = processLineItems([
      { label: "Arbeitslohn", menge: null, einzelpreis: null, gesamtpreis: "95,00" },
    ]);
    expect(item).toMatchObject({ menge: 1, einzelpreis: 95, gesamtpreis: 95 });
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
});
