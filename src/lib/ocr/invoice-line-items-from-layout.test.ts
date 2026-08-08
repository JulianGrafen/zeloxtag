import { describe, expect, it } from "vitest";

import type { AzureLayoutAnalyzeResult } from "@/lib/ocr/azure-document-intelligence";
import {
  extractInvoiceLineItemsFromAzureLayout,
  mergeLayoutAndLlmLineItems,
} from "@/lib/ocr/invoice-line-items-from-layout";

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
});

describe("mergeLayoutAndLlmLineItems", () => {
  it("prefers Azure rows when totals match better", () => {
    const llm = [{ label: "Arbeitslohn", amount: 480 }];
    const layout = [
      { label: "Sportfedern H&R", amount: 480 },
      { label: "Arbeitslohn", amount: 95 },
    ];

    expect(mergeLayoutAndLlmLineItems(llm, layout, 575)).toEqual(layout);
  });
});
