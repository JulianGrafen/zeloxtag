import { describe, expect, it } from "vitest";

import type { AzureLayoutAnalyzeResult } from "@/lib/ocr/azure-document-intelligence";
import {
  extractInvoiceLineItemsFromAzureLayout,
  extractRowLineTotalAmount,
  mergeLayoutAndLlmLineItems,
} from "@/lib/ocr/invoice-line-items-from-layout";
import { reconcileLineItemAmountsWithOcrText } from "@/lib/ocr/invoice-line-items-from-text";
import {
  BLOTZHEIM_27327_NET_SUM,
  BLOTZHEIM_27327_POSITIONS,
} from "@/lib/ocr/fixtures/blotzheim-27327-invoice";
import {
  BLOTZHEIM_EXPECTED_TOTALS,
  BLOTZHEIM_LLM_RAW_LINE_ITEMS,
} from "@/lib/ocr/fixtures/blotzheim-invoice-line-items";
import {
  SPEEDWORKZ_CAMERA_OCR_TEXT,
  SPEEDWORKZ_NET_SUM,
} from "@/lib/ocr/fixtures/speedworkz-invoice-line-items";

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

  it("merges wrapped description continuation row without Pos or Ges. Preis", () => {
    const result: AzureLayoutAnalyzeResult = {
      content: "",
      pages: [],
      tables: [
        {
          rowCount: 4,
          columnCount: 5,
          cells: [
            { rowIndex: 0, columnIndex: 0, content: "Pos" },
            { rowIndex: 0, columnIndex: 1, content: "Bezeichnung" },
            { rowIndex: 0, columnIndex: 2, content: "Menge" },
            { rowIndex: 0, columnIndex: 3, content: "E-Preis" },
            { rowIndex: 0, columnIndex: 4, content: "Ges. Preis" },
            { rowIndex: 1, columnIndex: 0, content: "4" },
            { rowIndex: 1, columnIndex: 1, content: "Bremsscheibe PRO+" },
            { rowIndex: 1, columnIndex: 2, content: "2,00" },
            { rowIndex: 1, columnIndex: 3, content: "165,99 €" },
            { rowIndex: 1, columnIndex: 4, content: "331,98 €" },
            { rowIndex: 2, columnIndex: 0, content: "5" },
            { rowIndex: 2, columnIndex: 1, content: "Beide Bremsscheiben erneuern" },
            { rowIndex: 2, columnIndex: 2, content: "0,90" },
            { rowIndex: 2, columnIndex: 3, content: "90,00 €" },
            { rowIndex: 2, columnIndex: 4, content: "81,00 €" },
            { rowIndex: 3, columnIndex: 1, content: "(Hinterachse)" },
          ],
        },
      ],
    };

    expect(extractInvoiceLineItemsFromAzureLayout(result)).toEqual([
      { label: "Bremsscheibe PRO+", amount: 331.98 },
      {
        label: "Beide Bremsscheiben erneuern (Hinterachse)",
        amount: 81,
      },
    ]);
  });

  it("accumulates split description rows before the amount row", () => {
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
            { rowIndex: 0, columnIndex: 2, content: "Menge" },
            { rowIndex: 0, columnIndex: 3, content: "Ges. Preis" },
            { rowIndex: 1, columnIndex: 0, content: "16" },
            { rowIndex: 1, columnIndex: 1, content: "Schraube, Einspritzdü." },
            { rowIndex: 2, columnIndex: 1, content: "ORIGINAL ERSATZTEIL" },
            { rowIndex: 3, columnIndex: 1, content: "GREENPARTS" },
            { rowIndex: 3, columnIndex: 2, content: "6,00" },
            { rowIndex: 3, columnIndex: 3, content: "15,06 €" },
          ],
        },
      ],
    };

    expect(extractInvoiceLineItemsFromAzureLayout(result)).toEqual([
      {
        label: "Schraube, Einspritzdü. ORIGINAL ERSATZTEIL GREENPARTS",
        amount: 15.06,
      },
    ]);
  });

  it("keeps the printed row order and Ges. Preis for a full Pos table", () => {
    const result: AzureLayoutAnalyzeResult = {
      content: "",
      pages: [],
      tables: [
        {
          rowCount: BLOTZHEIM_LLM_RAW_LINE_ITEMS.length + 1,
          columnCount: 5,
          cells: [
            { rowIndex: 0, columnIndex: 0, content: "Pos" },
            { rowIndex: 0, columnIndex: 1, content: "Bezeichnung" },
            { rowIndex: 0, columnIndex: 2, content: "Menge" },
            { rowIndex: 0, columnIndex: 3, content: "E-Preis" },
            { rowIndex: 0, columnIndex: 4, content: "Ges. Preis" },
            ...BLOTZHEIM_LLM_RAW_LINE_ITEMS.flatMap((item, index) => [
              { rowIndex: index + 1, columnIndex: 0, content: String(index + 1) },
              { rowIndex: index + 1, columnIndex: 1, content: item.label },
              { rowIndex: index + 1, columnIndex: 2, content: item.menge ?? "" },
              {
                rowIndex: index + 1,
                columnIndex: 3,
                content: item.einzelpreis ?? "",
              },
              {
                rowIndex: index + 1,
                columnIndex: 4,
                content: item.gesamtpreis ?? "",
              },
            ]),
          ],
        },
      ],
    };

    expect(extractInvoiceLineItemsFromAzureLayout(result)).toEqual(
      BLOTZHEIM_EXPECTED_TOTALS.filter((item) => item.amount > 0),
    );
  });

  it("uses rightmost money column when row has Einzelpreis and Ges. Preis", () => {
    const rowCells = [
      { rowIndex: 1, columnIndex: 1, content: "Reifen" },
      { rowIndex: 1, columnIndex: 2, content: "120,00" },
      { rowIndex: 1, columnIndex: 3, content: "480,00" },
    ];

    expect(extractRowLineTotalAmount(rowCells)).toBe(480);
  });

  it("parses camera-style workshop OCR from page lines when markdown is empty", () => {
    const result: AzureLayoutAnalyzeResult = {
      content: "",
      pages: [
        {
          pageNumber: 1,
          lines: SPEEDWORKZ_CAMERA_OCR_TEXT.split("\n").map((content) => ({
            content,
          })),
        },
      ],
      tables: [],
    };

    const items = extractInvoiceLineItemsFromAzureLayout(result);
    expect(items).not.toBeNull();
    expect(items!).toHaveLength(8);
    expect(items!.reduce((sum, item) => sum + item.amount, 0)).toBeCloseTo(
      SPEEDWORKZ_NET_SUM,
      2,
    );
  });
});

describe("extractRowLineTotalAmount", () => {
  it("returns null for E-Preis-only row without Menge or Ges. Preis", () => {
    expect(
      extractRowLineTotalAmount([
        { rowIndex: 2, columnIndex: 1, content: "Bremsbeläge erneuern" },
        { rowIndex: 2, columnIndex: 3, content: "90,00 €" },
      ]),
    ).toBeNull();
  });

  it("returns amount when Menge is present with a single price column", () => {
    expect(
      extractRowLineTotalAmount([
        { rowIndex: 2, columnIndex: 1, content: "Ölfilter" },
        { rowIndex: 2, columnIndex: 2, content: "1,00" },
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

  it("recomputes Ges. Preis from Menge × E-Preis when OCR garbles the total", () => {
    expect(
      extractRowLineTotalAmount([
        { rowIndex: 1, columnIndex: 1, content: "Bremsbelagsatz, Scheibenbremse" },
        { rowIndex: 1, columnIndex: 2, content: "1,00" },
        { rowIndex: 1, columnIndex: 3, content: "141,46 €" },
        { rowIndex: 1, columnIndex: 4, content: "1,47 €" },
      ]),
    ).toBe(141.46);
  });

  it("keeps printed Ges. Preis when it is a line discount on qty > 1", () => {
    expect(
      extractRowLineTotalAmount([
        { rowIndex: 4, columnIndex: 1, content: "Bremsscheibe PRO+" },
        { rowIndex: 4, columnIndex: 2, content: "2,00" },
        { rowIndex: 4, columnIndex: 3, content: "165,99 €" },
        { rowIndex: 4, columnIndex: 4, content: "301,33 €" },
      ]),
    ).toBe(301.33);
  });

  it("applies Rabatt-% when Ges. Preis is empty", () => {
    expect(
      extractRowLineTotalAmount(
        [
          { rowIndex: 8, columnIndex: 1, content: "Sensor, Kühlmitteltemperatur" },
          { rowIndex: 8, columnIndex: 2, content: "1,00" },
          { rowIndex: 8, columnIndex: 3, content: "41,04 €" },
          { rowIndex: 8, columnIndex: 4, content: "30,00" },
        ],
        {
          posColumnIndex: null,
          mengeColumnIndex: 2,
          nummerColumnIndex: null,
          rabattColumnIndex: 4,
        },
      ),
    ).toBe(28.73);
  });

  it("keeps genuine qty=1 line discounts below E-Preis", () => {
    expect(
      extractRowLineTotalAmount([
        { rowIndex: 8, columnIndex: 1, content: "Wasserpumpe" },
        { rowIndex: 8, columnIndex: 2, content: "1,00" },
        { rowIndex: 8, columnIndex: 3, content: "41,04 €" },
        { rowIndex: 8, columnIndex: 4, content: "28,73 €" },
      ]),
    ).toBe(28.73);
  });

  it("uses the printed rightmost Ges. Preis for discounted labor rows", () => {
    expect(
      extractRowLineTotalAmount([
        { rowIndex: 12, columnIndex: 1, content: "Motoröl und Filter wechseln" },
        { rowIndex: 12, columnIndex: 2, content: "0,50" },
        { rowIndex: 12, columnIndex: 3, content: "90,00 €" },
        { rowIndex: 12, columnIndex: 4, content: "45,00 €" },
      ]),
    ).toBe(45);
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

  it("keeps complete Pos layout rows even without a footer on this page", () => {
    const incorrectLlmRows = [
      { label: "Bremsscheibe PRO+", amount: 360 },
      { label: "Beide Bremsscheiben erneuern", amount: 90 },
      { label: "Beide Schraubenfedern erneuern", amount: 5.4 },
    ];
    const layoutRows = [
      { label: "Bremsscheibe PRO+", amount: 331.98 },
      { label: "Beide Bremsscheiben erneuern", amount: 81 },
      { label: "Beide Schraubenfedern erneuern", amount: 225 },
    ];

    expect(
      mergeLayoutAndLlmLineItems(incorrectLlmRows, layoutRows, null, {
        preferLayoutRows: true,
      }),
    ).toEqual(layoutRows);
  });

  it("prefers LLM rows when layout OCR totals are garbled", () => {
    const llmRows = [
      { label: "Bremsbelagsatz, Scheibenbremse", amount: 141.46 },
      { label: "Bremsscheibe PRO+", amount: 331.98 },
    ];
    const garbledLayout = [
      { label: "Bremsbelagsatz, Scheibenbremse", amount: 1.47 },
      { label: "Bremsscheibe PRO+", amount: 301.33 },
    ];

    expect(
      mergeLayoutAndLlmLineItems(llmRows, garbledLayout, null, {
        preferLlmRows: true,
      }),
    ).toEqual(llmRows);
  });

  it("hybrid merge keeps layout Ges. Preis and appends unmatched LLM rows", () => {
    const llmRows = [
      { label: "Bremsbelagsatz, Scheibenbremse", amount: 141.46 },
      { label: "Bremsscheibe PRO+", amount: 331.98 },
      { label: "Beide Bremsscheiben erneuern", amount: 81 },
    ];
    const layoutRows = [
      { label: "Bremsbelagsatz, Scheibenbremse", amount: 141.46 },
      { label: "Bremsscheibe PRO+", amount: 331.98 },
    ];

    expect(mergeLayoutAndLlmLineItems(llmRows, layoutRows, null)).toEqual([
      { label: "Bremsbelagsatz, Scheibenbremse", amount: 141.46 },
      { label: "Bremsscheibe PRO+", amount: 331.98 },
      { label: "Beide Bremsscheiben erneuern", amount: 81 },
    ]);
  });

  it("keeps only complete layout rows when they reconcile with Nettosumme", () => {
    const incorrectLlmRows = [
      { label: "AGR-Ventil", amount: 54 },
      { label: "Abgasrückführungsventil erneuern", amount: 54 },
      { label: "Winterräder montiert", amount: 20 },
      { label: "Abgasrückführungsventil erneuern", amount: 130.8 },
    ];

    expect(
      mergeLayoutAndLlmLineItems(
        incorrectLlmRows,
        [...BLOTZHEIM_27327_POSITIONS],
        348.53,
        { trustedNetTotal: BLOTZHEIM_27327_NET_SUM },
      ),
    ).toEqual(BLOTZHEIM_27327_POSITIONS);
  });
});

describe("reconcileLineItemAmountsWithOcrText", () => {
  it("upgrades shifted amounts when Pos OCR label matches", () => {
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
