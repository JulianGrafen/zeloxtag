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

  it("computes Ges. Preis from Menge × E-Preis with explicit Menge column", () => {
    const result: AzureLayoutAnalyzeResult = {
      content: "",
      pages: [],
      tables: [
        {
          rowCount: 3,
          columnCount: 5,
          cells: [
            { rowIndex: 0, columnIndex: 0, content: "Pos" },
            { rowIndex: 0, columnIndex: 1, content: "Bezeichnung" },
            { rowIndex: 0, columnIndex: 2, content: "Menge" },
            { rowIndex: 0, columnIndex: 3, content: "E-Preis" },
            { rowIndex: 0, columnIndex: 4, content: "Ges. Preis" },
            { rowIndex: 1, columnIndex: 0, content: "1" },
            { rowIndex: 1, columnIndex: 1, content: "Reifen" },
            { rowIndex: 1, columnIndex: 2, content: "4" },
            { rowIndex: 1, columnIndex: 3, content: "120,00" },
            { rowIndex: 1, columnIndex: 4, content: "480,00" },
          ],
        },
      ],
    };

    expect(extractInvoiceLineItemsFromAzureLayout(result)).toEqual([
      { label: "Reifen", amount: 480 },
    ]);
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
