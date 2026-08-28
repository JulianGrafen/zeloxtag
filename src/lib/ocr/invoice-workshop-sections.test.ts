import { describe, expect, it } from "vitest";

import {
  SPEEDWORKZ_CAMERA_OCR_TEXT,
  SPEEDWORKZ_EXPECTED_LINE_ITEMS,
  SPEEDWORKZ_GROSS_TOTAL,
  SPEEDWORKZ_LLM_RAW_LINE_ITEMS,
  SPEEDWORKZ_NET_SUM,
  SPEEDWORKZ_OCR_TEXT,
  SPEEDWORKZ_VAT,
} from "@/lib/ocr/fixtures/speedworkz-invoice-line-items";
import { extractInvoiceLineItemsFromText } from "@/lib/ocr/invoice-line-items-from-text";
import {
  extractWorkshopInvoiceAmount,
  extractWorkshopInvoiceVatAmount,
  extractWorkshopSectionLineItems,
  isGarbageWorkshopLineItems,
  isWorkshopSectionInvoiceText,
  prejoinWorkshopSectionLines,
  resolveWorkshopLineItems,
  sectionOcrMatchesFooterNet,
} from "@/lib/ocr/invoice-workshop-sections";
import { extractAmountFromText } from "@/lib/ocr/amount-from-text";
import {
  extractGrossTotalFromText,
  extractNetSumFromText,
} from "@/lib/ocr/invoice-footer-totals";
import { processLineItems } from "@/utils/invoiceMath";

describe("Speedworkz section invoice", () => {
  it("detects workshop section layout", () => {
    expect(isWorkshopSectionInvoiceText(SPEEDWORKZ_OCR_TEXT)).toBe(true);
  });

  it("extracts all 8 billable positions from OCR text", () => {
    const items = extractWorkshopSectionLineItems(SPEEDWORKZ_OCR_TEXT);
    expect(items).not.toBeNull();
    expect(items!).toHaveLength(8);

    for (let i = 0; i < SPEEDWORKZ_EXPECTED_LINE_ITEMS.length; i += 1) {
      expect(items![i]!.label).toContain(
        SPEEDWORKZ_EXPECTED_LINE_ITEMS[i]!.label.split(" ")[0]!,
      );
      expect(items![i]!.amount).toBeCloseTo(
        SPEEDWORKZ_EXPECTED_LINE_ITEMS[i]!.amount,
        2,
      );
    }

    const sum = items!.reduce((acc, item) => acc + item.amount, 0);
    expect(sum).toBeCloseTo(SPEEDWORKZ_NET_SUM, 2);
  });

  it("skips description-only labor lines without price", () => {
    const items = extractWorkshopSectionLineItems(SPEEDWORKZ_OCR_TEXT)!;
    const labels = items.map((item) => item.label.toLowerCase());
    expect(labels.some((label) => label.includes("thermostat gebrochen"))).toBe(
      false,
    );
    expect(labels.some((label) => label.includes("wasserflansch"))).toBe(false);
  });

  it("extracts Endpreis and MwSt from footer", () => {
    expect(extractWorkshopInvoiceAmount(SPEEDWORKZ_OCR_TEXT)).toBe(
      SPEEDWORKZ_GROSS_TOTAL,
    );
    expect(extractWorkshopInvoiceVatAmount(SPEEDWORKZ_OCR_TEXT)).toBe(
      SPEEDWORKZ_VAT,
    );
    expect(extractAmountFromText(SPEEDWORKZ_OCR_TEXT)).toBe(
      SPEEDWORKZ_GROSS_TOTAL,
    );
  });

  it("uses section parser in extractInvoiceLineItemsFromText fallback", () => {
    const items = extractInvoiceLineItemsFromText(SPEEDWORKZ_OCR_TEXT);
    expect(items).toHaveLength(8);
    expect(items![0]!.amount).toBeCloseTo(46.22, 2);
  });

  it("processes LLM raw strings for Speedworkz layout", () => {
    const processed = processLineItems(SPEEDWORKZ_LLM_RAW_LINE_ITEMS, {
      checksumMode: "standard",
    });
    expect(processed).toHaveLength(8);

    for (let i = 0; i < SPEEDWORKZ_EXPECTED_LINE_ITEMS.length; i += 1) {
      expect(processed[i]!.gesamtpreis).toBeCloseTo(
        SPEEDWORKZ_EXPECTED_LINE_ITEMS[i]!.amount,
        2,
      );
    }

    const sum = processed.reduce((acc, row) => acc + row.gesamtpreis, 0);
    expect(sum).toBeCloseTo(SPEEDWORKZ_NET_SUM, 2);
  });

  it("ignores Art column when LLM copies it into menge with hours as einzelpreis", () => {
    const [item] = processLineItems([
      {
        label: "Motor wird heiß lt. Kunde Thermost wurde erneuert",
        menge: "4",
        einzelpreis: "0,50",
        gesamtpreis: "46,22 €",
      },
    ]);
    expect(item!.gesamtpreis).toBeCloseTo(46.22, 2);
  });

  it("rejects production garbage (Stück labels) in favor of OCR section parser", () => {
    const garbageLlm = [
      { label: "Stück", amount: 169.0 },
      { label: "Stück", amount: 70.83 },
      { label: "Stück", amount: 65.12 },
      { label: "Motor wird heiß lt. Kunde Thermost wurde erneuert", amount: 28.73 },
      { label: "Thermostat und Wasserschlauch erneuern", amount: 23.11 },
      { label: "Endpreis", amount: 41.04 },
    ];

    expect(isGarbageWorkshopLineItems(garbageLlm)).toBe(true);

    const resolved = resolveWorkshopLineItems({
      llmItems: garbageLlm,
      ocrText: SPEEDWORKZ_OCR_TEXT,
    });

    expect(resolved).toHaveLength(8);
    expect(resolved!.reduce((s, i) => s + i.amount, 0)).toBeCloseTo(
      SPEEDWORKZ_NET_SUM,
      2,
    );
  });

  it("falls back to OCR when LLM merges section rows into mega-labels", () => {
    const garbledLlm = [
      {
        label: "Motor wird heiß lt. Kunde Thermostat wurde erneuert",
        amount: 46.22,
      },
      { label: "Wasserschlauch undicht", amount: 166.37 },
      {
        label:
          "Thermostat und Wasserschlauch erneuern Kühlmitteltemp.sensor prüfen und erneuern Wasserschlauch Thermostat Kühlerfrostschutz",
        amount: 70.83,
      },
      { label: "Sensor, Kühlmitteltemperatur Fracht", amount: 28.73 },
    ];

    expect(
      isGarbageWorkshopLineItems(garbledLlm, { netSum: SPEEDWORKZ_NET_SUM }),
    ).toBe(true);

    const resolved = resolveWorkshopLineItems({
      llmItems: garbledLlm,
      ocrText: SPEEDWORKZ_OCR_TEXT,
    });

    expect(resolved).toHaveLength(8);
    for (let i = 0; i < SPEEDWORKZ_EXPECTED_LINE_ITEMS.length; i += 1) {
      expect(resolved![i]!.amount).toBeCloseTo(
        SPEEDWORKZ_EXPECTED_LINE_ITEMS[i]!.amount,
        2,
      );
    }
    expect(resolved!.reduce((s, i) => s + i.amount, 0)).toBeCloseTo(
      SPEEDWORKZ_NET_SUM,
      2,
    );
  });

  it("reads Netto Summe and Endpreis via the shared footer extractors", () => {
    expect(extractNetSumFromText(SPEEDWORKZ_OCR_TEXT)).toBe(SPEEDWORKZ_NET_SUM);
    expect(extractGrossTotalFromText(SPEEDWORKZ_OCR_TEXT)).toBe(
      SPEEDWORKZ_GROSS_TOTAL,
    );
    expect(sectionOcrMatchesFooterNet(SPEEDWORKZ_OCR_TEXT)).toBe(true);
  });

  it("extracts 8 positions from camera OCR with wrapped amounts and notes", () => {
    const items = extractWorkshopSectionLineItems(SPEEDWORKZ_CAMERA_OCR_TEXT);
    expect(items).not.toBeNull();
    expect(items!).toHaveLength(8);

    const labels = items!.map((item) => item.label.toLowerCase());
    expect(labels.some((label) => label.includes("thermostat gebrochen"))).toBe(
      false,
    );
    expect(labels.some((label) => label.includes("wasserflansch"))).toBe(false);
    expect(items!.some((item) => /kühlerfrostschutz/i.test(item.label))).toBe(
      true,
    );
    expect(
      items!.find((item) => /kühlerfrostschutz/i.test(item.label))!.label,
    ).toMatch(/blau\/rot/i);

    const sum = items!.reduce((acc, item) => acc + item.amount, 0);
    expect(sum).toBeCloseTo(SPEEDWORKZ_NET_SUM, 2);
    expect(sectionOcrMatchesFooterNet(SPEEDWORKZ_CAMERA_OCR_TEXT)).toBe(true);
    expect(extractWorkshopInvoiceAmount(SPEEDWORKZ_CAMERA_OCR_TEXT)).toBe(
      SPEEDWORKZ_GROSS_TOTAL,
    );
  });

  it("joins description + next-line amount without billing diagnostic notes", () => {
    const joined = prejoinWorkshopSectionLines(
      [
        "Motor wird heiß lt. Kunde Thermostat wurde erneuert",
        "46,22",
        "Thermostat gebrochen",
        "Wasserflansch undicht",
        "Thermostat und Wasserschlauch erneuern",
        "166,37",
      ].join("\n"),
    );

    expect(joined).toContain(
      "Motor wird heiß lt. Kunde Thermostat wurde erneuert 46,22",
    );
    expect(joined).toContain("Thermostat und Wasserschlauch erneuern 166,37");
    expect(joined).toContain("Thermostat gebrochen");
    expect(joined).toContain("Wasserflansch undicht");
  });

  it("replaces mega-merged vision rows using camera OCR checksum", () => {
    const garbledLlm = [
      {
        label: "Motor wird heiß lt. Kunde Thermostat wurde erneuert",
        amount: 46.22,
      },
      { label: "Wasserschlauch undicht", amount: 166.37 },
      {
        label:
          "Thermostat und Wasserschlauch erneuern Kühlmitteltemp.sensor prüfen und erneuern Wasserschlauch Thermostat Kühlerfrostschutz",
        amount: 70.83,
      },
      { label: "Sensor, Kühlmitteltemperatur Fracht", amount: 28.73 },
    ];

    const resolved = resolveWorkshopLineItems({
      llmItems: garbledLlm,
      ocrText: SPEEDWORKZ_CAMERA_OCR_TEXT,
    });

    expect(resolved).toHaveLength(8);
    expect(resolved!.reduce((s, i) => s + i.amount, 0)).toBeCloseTo(
      SPEEDWORKZ_NET_SUM,
      2,
    );
  });
});

describe("section invoice checksum (vendor-agnostic)", () => {
  it("does not treat a short invoice as garbage when the net footer matches", () => {
    const items = [
      { label: "Ölfilter", amount: 42.9 },
      { label: "Arbeitslohn", amount: 95 },
      { label: "Fracht", amount: 5 },
    ];
    expect(isGarbageWorkshopLineItems(items, { netSum: 142.9 })).toBe(false);
  });

  it("recovers merged vision rows for any DMS section invoice, not a named vendor", () => {
    const ocr = [
      "Arbeitswerte",
      "Beschreibung PG Std. Preis-€",
      "Diagnose Kühlkreislauf 4 0,50 46,22",
      "Thermostat und Schlauch erneuern 4 1,80 166,37",
      "Ersatzteile",
      "Anzahl Einheit Beschreibung Einzelpreis Preis-€",
      "1 Stück Wasserschlauch 65,12 65,12",
      "1 Stück Thermostat 70,83 70,83",
      "Sonstige Kosten",
      "1 Fracht 5,00 5,00",
      "Positionssumme 353,54",
      "Netto Summe 353,54 €",
      "Endpreis 420,71 €",
    ].join("\n");

    const garbled = [
      { label: "Diagnose Kühlkreislauf Thermostat und Schlauch erneuern Wasserschlauch Thermostat Fracht", amount: 70.83 },
      { label: "Fracht", amount: 5 },
    ];

    const resolved = resolveWorkshopLineItems({
      llmItems: garbled,
      ocrText: ocr,
    });

    expect(sectionOcrMatchesFooterNet(ocr)).toBe(true);
    expect(resolved).toHaveLength(5);
    expect(resolved!.reduce((sum, item) => sum + item.amount, 0)).toBeCloseTo(
      353.54,
      2,
    );
  });

  it("uses extra OCR candidates when markdown is thin but layout parsed positions", () => {
    const extra = [
      { label: "Diagnose", amount: 46.22 },
      { label: "Schlauch erneuern", amount: 166.37 },
      { label: "Wasserschlauch", amount: 65.12 },
      { label: "Thermostat", amount: 70.83 },
      { label: "Fracht", amount: 5 },
    ];
    const thinMarkdown = "Positionssumme 353,54\nNetto Summe 353,54 €";
    const garbled = [
      { label: "Diagnose Schlauch erneuern Wasserschlauch Thermostat Fracht", amount: 70.83 },
      { label: "Fracht", amount: 5 },
    ];

    const resolved = resolveWorkshopLineItems({
      llmItems: garbled,
      ocrText: thinMarkdown,
      extraOcrItems: extra,
    });

    expect(resolved).toHaveLength(5);
    expect(resolved!.reduce((sum, item) => sum + item.amount, 0)).toBeCloseTo(
      353.54,
      2,
    );
  });
});
