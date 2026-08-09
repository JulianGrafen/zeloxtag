import { describe, expect, it } from "vitest";

import type { AzureLayoutAnalyzeResult } from "@/lib/ocr/azure-document-intelligence";
import {
  extractInvoiceLineItemsFromAzureLayout,
  extractRowLineTotalAmount,
  mergeLayoutAndLlmLineItems,
} from "@/lib/ocr/invoice-line-items-from-layout";
import { reconcileLineItemAmountsWithOcrText } from "@/lib/ocr/invoice-line-items-from-text";

describe("extractInvoiceLineItemsFromAzureLayout", () => {
  it("pairs label and Ges. Preis by rowIndex", () => {
    const result: AzureLayoutAnalyzeResult = {
      content: "",
      pages: [],
      tables: [
        {
          rowCount: 4,
          columnCount: 4,
          cells: [
            { rowIndex: 0, columnIndex: 0, content: "Pos" },
            { rowIndex: 0, columnIndex: 1, content: "Bezeichnung" },
            { rowIndex: 0, columnIndex: 2, content: "Einzelpreis" },
            { rowIndex: 0, columnIndex: 3, content: "Ges. Preis" },
            { rowIndex: 1, columnIndex: 0, content: "1" },
            { rowIndex: 1, columnIndex: 1, content: "Sportfedern H&R" },
            { rowIndex: 1, columnIndex: 2, content: "120,00" },
            { rowIndex: 1, columnIndex: 3, content: "480,00" },
            { rowIndex: 2, columnIndex: 0, content: "2" },
            { rowIndex: 2, columnIndex: 1, content: "Arbeitslohn" },
            { rowIndex: 2, columnIndex: 2, content: "95,00" },
            { rowIndex: 2, columnIndex: 3, content: "95,00" },
          ],
        },
      ],
    };

    expect(extractInvoiceLineItemsFromAzureLayout(result)).toEqual([
      { label: "Sportfedern H&R", amount: 480 },
      { label: "Arbeitslohn", amount: 95 },
    ]);
  });

  it("uses rightmost money column when row has Einzelpreis and Ges. Preis", () => {
    const rowCells = [
      { rowIndex: 1, columnIndex: 1, content: "Reifen" },
      { rowIndex: 1, columnIndex: 2, content: "120,00" },
      { rowIndex: 1, columnIndex: 3, content: "480,00" },
    ];

    expect(extractRowLineTotalAmount(rowCells)).toBe(480);
  });
});

describe("extractRowLineTotalAmount", () => {
  it("returns the only amount when row has a single price", () => {
    expect(
      extractRowLineTotalAmount([
        { rowIndex: 2, columnIndex: 1, content: "Ölfilter" },
        { rowIndex: 2, columnIndex: 3, content: "42,90" },
      ]),
    ).toBe(42.9);
  });

  it("multiplies unit price by row quantity when Ges. Preis column is missing", () => {
    expect(
      extractRowLineTotalAmount([
        { rowIndex: 1, columnIndex: 0, content: "1" },
        { rowIndex: 1, columnIndex: 1, content: "Reifen" },
        { rowIndex: 1, columnIndex: 2, content: "4" },
        { rowIndex: 1, columnIndex: 3, content: "120,00" },
      ]),
    ).toBe(480);
  });

  it("multiplies fractional labor hours (Blotzheim: 0,90 × 90,00)", () => {
    expect(
      extractRowLineTotalAmount([
        { rowIndex: 5, columnIndex: 1, content: "Beide Bremsscheiben erneuern" },
        { rowIndex: 5, columnIndex: 2, content: "0,90" },
        { rowIndex: 5, columnIndex: 3, content: "90,00" },
      ]),
    ).toBe(81);
  });

  it("multiplies Liter quantity (Blotzheim: 7,00 Liter × 13,45)", () => {
    expect(
      extractRowLineTotalAmount([
        { rowIndex: 14, columnIndex: 1, content: "Motoröl 5W30" },
        { rowIndex: 14, columnIndex: 2, content: "7,00 Liter" },
        { rowIndex: 14, columnIndex: 3, content: "13,45" },
      ]),
    ).toBe(94.15);
  });

  it("uses rightmost Ges. Preis when both E-Preis and Ges. Preis exist (2 × 165,99 → 331,98)", () => {
    expect(
      extractRowLineTotalAmount([
        { rowIndex: 4, columnIndex: 1, content: "Bremsscheibe PRO+" },
        { rowIndex: 4, columnIndex: 2, content: "2,00" },
        { rowIndex: 4, columnIndex: 3, content: "165,99 €" },
        { rowIndex: 4, columnIndex: 4, content: "331,98 €" },
      ]),
    ).toBe(331.98);
  });

  it("does not multiply Pos column with E-Preis (Blotzheim row 3)", () => {
    expect(
      extractRowLineTotalAmount(
        [
          { rowIndex: 3, columnIndex: 0, content: "3" },
          { rowIndex: 3, columnIndex: 1, content: "2456101" },
          { rowIndex: 3, columnIndex: 2, content: "Warnkontakt, Bremsbelagverschleiß" },
          { rowIndex: 3, columnIndex: 3, content: "1,00" },
          { rowIndex: 3, columnIndex: 5, content: "28,80 €" },
          { rowIndex: 3, columnIndex: 6, content: "28,80 €" },
        ],
        {
          posColumnIndex: 0,
          mengeColumnIndex: 3,
          nummerColumnIndex: 1,
        },
      ),
    ).toBe(28.8);
  });
});

describe("mergeLayoutAndLlmLineItems", () => {
  it("prefers Azure rows when totals match better", () => {
    const llm = [{ label: "Arbeitslohn", amount: 480 }];
    const layout = [
      { label: "Sportfedern H&R", amount: 480 },
      { label: "Arbeitslohn", amount: 95 },
    ];

    expect(mergeLayoutAndLlmLineItems(llm, layout, 575)).toEqual([
      { label: "Sportfedern H&R", amount: 480 },
      { label: "Arbeitslohn", amount: 95 },
    ]);
  });

  it("keeps layout Ges. Preis when LLM captured Einzelpreis", () => {
    const llm = [
      { label: "Sportfedern H&R", amount: 120 },
      { label: "Arbeitslohn", amount: 95 },
    ];
    const layout = [
      { label: "Sportfedern H&R", amount: 480 },
      { label: "Arbeitslohn", amount: 95 },
    ];

    expect(mergeLayoutAndLlmLineItems(llm, layout, 575)).toEqual([
      { label: "Sportfedern H&R", amount: 480 },
      { label: "Arbeitslohn", amount: 95 },
    ]);
  });
});

describe("reconcileLineItemAmountsWithOcrText", () => {
  it("upgrades LLM Einzelpreis to OCR Ges. Preis for the same row", () => {
    const ocrText = [
      "Pos Bezeichnung Menge Einzelpreis Ges. Preis",
      "1 Sportfedern H&R 4 120,00 480,00",
      "2 Arbeitslohn 1 95,00 95,00",
    ].join("\n");

    expect(
      reconcileLineItemAmountsWithOcrText(
        [
          { label: "Sportfedern H&R", amount: 120 },
          { label: "Arbeitslohn", amount: 95 },
        ],
        ocrText,
      ),
    ).toEqual([
      { label: "Sportfedern H&R", amount: 480 },
      { label: "Arbeitslohn", amount: 95 },
    ]);
  });
});
