import { describe, expect, it } from "vitest";

import {
  isContinuationInvoiceLabel,
  mergeContinuationInvoiceLineItems,
  prejoinWrappedInvoiceLines,
  realignShiftedInvoiceLineItems,
} from "./invoice-line-item-alignment";

describe("mergeContinuationInvoiceLineItems", () => {
  it("merges (Hinterachse) into the previous Bremsscheiben row", () => {
    const items = [
      { label: "Beide Bremsscheiben erneuern", amount: 90 },
      { label: "(Hinterachse)", amount: 81 },
    ];

    expect(mergeContinuationInvoiceLineItems(items)).toEqual([
      {
        label: "Beide Bremsscheiben erneuern (Hinterachse)",
        amount: 81,
      },
    ]);
  });

  it("merges triple continuation Schraube + ORIGINAL ERSATZTEIL + GREENPARTS", () => {
    const items = [
      { label: "Schraube, Einspritzdüsenhalter", amount: 15.06 },
      { label: "ORIGINAL ERSATZTEIL", amount: 0 },
      { label: "GREENPARTS", amount: 0 },
    ];

    expect(mergeContinuationInvoiceLineItems(items)).toEqual([
      {
        label: "Schraube, Einspritzdüsenhalter ORIGINAL ERSATZTEIL GREENPARTS",
        amount: 15.06,
      },
    ]);
  });

  it("leaves amounts unchanged after merge when realign is not needed", () => {
    const items = [
      { label: "Bremsscheibe PRO+", amount: 331.98 },
      { label: "Beide Bremsscheiben erneuern (Hinterachse)", amount: 81 },
    ];

    const merged = mergeContinuationInvoiceLineItems(items);
    expect(realignShiftedInvoiceLineItems(merged, 412.98)).toEqual(merged);
  });

  it("fixes phantom rows with shifted amounts before realign would scramble totals", () => {
    const phantomRows = [
      { label: "Beide Bremsscheiben erneuern", amount: 90 },
      { label: "(Hinterachse)", amount: 0 },
      { label: "Ventildeckeldichtung erneuern", amount: 81 },
    ];

    const merged = mergeContinuationInvoiceLineItems(phantomRows);
    expect(merged).toEqual([
      { label: "Beide Bremsscheiben erneuern (Hinterachse)", amount: 90 },
      { label: "Ventildeckeldichtung erneuern", amount: 81 },
    ]);
    expect(realignShiftedInvoiceLineItems(merged, 171)).toEqual(merged);
  });

  it("does not merge standalone part names like Thermostat or Fracht", () => {
    const items = [
      { label: "Wasserschlauch", amount: 65.12 },
      { label: "Thermostat", amount: 70.83 },
      { label: "Kühlerfrostschutz Blau/Rot", amount: 26 },
      { label: "Sensor, Kühlmitteltemperatur", amount: 28.73 },
      { label: "Fracht", amount: 5 },
    ];

    expect(mergeContinuationInvoiceLineItems(items)).toEqual(items);
  });
});

describe("isContinuationInvoiceLabel", () => {
  it("accepts Pos-table wrap fragments only", () => {
    expect(isContinuationInvoiceLabel("(Hinterachse)")).toBe(true);
    expect(isContinuationInvoiceLabel("GREENPARTS")).toBe(true);
    expect(isContinuationInvoiceLabel("ORIGINAL ERSATZTEIL")).toBe(true);
    expect(isContinuationInvoiceLabel("erneuern")).toBe(true);
  });

  it("rejects workshop part names and diagnostic fragments", () => {
    expect(isContinuationInvoiceLabel("Thermostat")).toBe(false);
    expect(isContinuationInvoiceLabel("Wasserschlauch")).toBe(false);
    expect(isContinuationInvoiceLabel("Fracht")).toBe(false);
    expect(isContinuationInvoiceLabel("undicht")).toBe(false);
  });
});

describe("realignShiftedInvoiceLineItems", () => {
  it("fixes amounts shifted one row down (header row consumes first amount)", () => {
    const shifted = [
      { label: "Bezeichnung", amount: 480 },
      { label: "Sportfedern H&R", amount: 120 },
      { label: "Arbeitslohn", amount: 45 },
      { label: "Entsorgung", amount: 12 },
    ];

    const fixed = realignShiftedInvoiceLineItems(shifted, 657);
    expect(fixed).toEqual([
      { label: "Sportfedern H&R", amount: 480 },
      { label: "Arbeitslohn", amount: 120 },
      { label: "Entsorgung", amount: 45 },
    ]);
  });

  it("fixes amounts paired with the next row when total matches", () => {
    const shifted = [
      { label: "Ölfilter", amount: 89.9 },
      { label: "Motoröl 5W-30", amount: 42.5 },
    ];

    const fixed = realignShiftedInvoiceLineItems(shifted, 42.5);
    expect(fixed).toEqual([{ label: "Ölfilter", amount: 42.5 }]);
  });

  it("keeps already correct rows unchanged", () => {
    const items = [
      { label: "Bremsbeläge vorne", amount: 189.9 },
      { label: "Arbeitslohn", amount: 95 },
    ];

    expect(realignShiftedInvoiceLineItems(items, 284.9)).toEqual(items);
  });
});

describe("prejoinWrappedInvoiceLines", () => {
  it("joins a wrapped description with the amount on the next line", () => {
    const text = ["Sportfedern H&R Tieferlegung", "480,00"].join("\n");
    expect(prejoinWrappedInvoiceLines(text)).toBe(
      "Sportfedern H&R Tieferlegung 480,00",
    );
  });

  it("does not glue table header rows to the first data row", () => {
    const text = [
      "Pos Bezeichnung Menge Einzelpreis Ges. Preis",
      "1 Sportfedern H&R 4 120,00 480,00",
      "2 Arbeitslohn 1 95,00 95,00",
    ].join("\n");

    expect(prejoinWrappedInvoiceLines(text)).toBe(text);
  });

  it("joins desc+desc continuation lines before amount row", () => {
    const text = [
      "Beide Bremsscheiben erneuern",
      "(Hinterachse)",
      "1 Ventildeckeldichtung 4,00 90,00 360,00",
    ].join("\n");

    expect(prejoinWrappedInvoiceLines(text)).toBe(
      "Beide Bremsscheiben erneuern (Hinterachse)\n1 Ventildeckeldichtung 4,00 90,00 360,00",
    );
  });

  it("joins ALL-CAPS continuation fragments into the previous description", () => {
    const text = [
      "Schraube, Einspritzdüsenhalter",
      "ORIGINAL ERSATZTEIL",
      "GREENPARTS",
      "15,06",
    ].join("\n");

    expect(prejoinWrappedInvoiceLines(text)).toBe(
      "Schraube, Einspritzdüsenhalter ORIGINAL ERSATZTEIL GREENPARTS 15,06",
    );
  });
});
