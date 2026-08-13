import { describe, expect, it } from "vitest";

import {
  BLOTZHEIM_27327_OCR_TEXT,
  BLOTZHEIM_27327_POSITIONS,
} from "@/lib/ocr/fixtures/blotzheim-27327-invoice";
import {
  BLOTZHEIM_EXPECTED_TOTALS,
  BLOTZHEIM_LLM_RAW_LINE_ITEMS,
  BLOTZHEIM_NET_SUM,
} from "@/lib/ocr/fixtures/blotzheim-invoice-line-items";
import type { AzureLayoutAnalyzeResult } from "@/lib/ocr/azure-document-intelligence";
import { finalizeColumnFormatLineItems } from "@/lib/ocr/invoice-column-pipeline";
import {
  extractInvoiceLineItemsFromAzureLayout,
  mergeLayoutAndLlmLineItems,
} from "@/lib/ocr/invoice-line-items-from-layout";
import { processLineItems } from "@/utils/invoiceMath";

const SHIFTED_LLM_RAW = BLOTZHEIM_LLM_RAW_LINE_ITEMS.map((row) => {
  if (row.label.startsWith("Beide Bremsscheiben erneuern")) {
    return { ...row, gesamtpreis: "360,00 €" };
  }
  if (row.label.startsWith("Beide Schraubenfedern erneuern")) {
    return { ...row, gesamtpreis: "5,40 €" };
  }
  if (row.label.startsWith("Kühlerfrostschutz")) {
    return { ...row, gesamtpreis: "135,00 €" };
  }
  if (row.label.startsWith("Ölfilter")) {
    return { ...row, gesamtpreis: "45,00 €" };
  }
  return row;
});

function buildBlotzheim27646Layout(): AzureLayoutAnalyzeResult {
  return {
    content: `Nettosumme ${BLOTZHEIM_NET_SUM.toFixed(2).replace(".", ",")} €`,
    pages: [{ pageNumber: 1, width: 800, height: 1200 }],
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
}

describe("finalizeColumnFormatLineItems", () => {
  it("trusts layout rows when they reconcile with Nettosumme", () => {
    const shiftedLlm = [
      { label: "AGR-Ventil", amount: 54 },
      { label: "Abgasrückführungsventil erneuern", amount: 130.8 },
      { label: "Winterräder montiert", amount: 218.88 },
    ];

    const result = finalizeColumnFormatLineItems({
      llmItems: shiftedLlm,
      layoutItems: [...BLOTZHEIM_27327_POSITIONS],
      ocrText: BLOTZHEIM_27327_OCR_TEXT,
      grossAmount: 348.53,
    });

    expect(result.lineItems).toEqual([
      ...BLOTZHEIM_27327_POSITIONS,
      { label: "MwSt (19 % (A))", amount: 55.65 },
    ]);
    expect(result.amount).toBe(348.53);
    expect(
      result.lineItems!.reduce((sum, item) => sum + item.amount, 0),
    ).toBeCloseTo(348.53, 2);
  });

  it("keeps Azure layout rows for Blotzheim 27646 when layout reconciles (skips OCR reconcile/realign)", () => {
    const layout = extractInvoiceLineItemsFromAzureLayout(buildBlotzheim27646Layout());
    const shiftedLlm = processLineItems(SHIFTED_LLM_RAW, { checksumMode: "column" })
      .filter((item) => item.gesamtpreis > 0)
      .map((item) => ({
        label: String(item.label).trim(),
        amount: item.gesamtpreis,
      }));

    const ocrText = [
      "Pos Bezeichnung Menge E-Preis Ges. Preis",
      ...BLOTZHEIM_LLM_RAW_LINE_ITEMS.map(
        (row, index) =>
          `${index + 1} ${row.label} ${row.menge ?? ""} ${row.einzelpreis ?? ""} ${row.gesamtpreis ?? "360,00 €"}`,
      ),
      `Nettosumme ${BLOTZHEIM_NET_SUM.toFixed(2).replace(".", ",")} €`,
      "Gesamtbetrag 2.222,60 €",
    ].join("\n");

    const result = finalizeColumnFormatLineItems({
      llmItems: shiftedLlm,
      layoutItems: layout,
      ocrText,
      grossAmount: 2222.6,
    });

    const billable = BLOTZHEIM_EXPECTED_TOTALS.filter((row) => row.amount > 0);
    expect(result.lineItems).toHaveLength(billable.length + 1);
    expect(
      result.lineItems!.find((item) => item.label.includes("Beide Bremsscheiben"))!
        .amount,
    ).toBe(81);
    expect(
      result.lineItems!.find((item) => item.label.includes("Beide Schraubenfedern"))!
        .amount,
    ).toBe(225);
    expect(
      billable.reduce((sum, row) => sum + row.amount, 0),
    ).toBeCloseTo(BLOTZHEIM_NET_SUM, 2);
  });

  it("self-trusts layout rows when no Nettosumme is in the OCR text (Blotzheim truncated-page case)", () => {
    // Simulates the Blotzheim 27646 PDF scenario:
    //   • Vision LLM read page 1 (truncated Ges.-Preis column) → wrong amounts
    //   • Layout comes from page 2 (complete values) → correct amounts
    //   • OCR text has no "Nettosumme" → footerNet is null
    // Expected: layout rows used unconditionally (self-trust), no realignment.
    const layoutRows = [
      { label: "Bremsbelagsatz, Scheibenbremse", amount: 141.46 },
      { label: "Warnkontakt, Bremsbelagverschleiß", amount: 28.80 },
      { label: "Bremsscheibe PRO+", amount: 331.98 },
      { label: "Beide Bremsscheiben erneuern (Hinterachse)", amount: 81.00 },
      { label: "Kühlerfrostschutz", amount: 21.42 },
      { label: "Ölfilter", amount: 23.86 },
    ];
    const shiftedLlm = [
      { label: "Bremsbelagsatz, Scheibenbremse", amount: 141.46 },
      { label: "Warnkontakt, Bremsbelagverschleiß", amount: 28.80 },
      { label: "Bremsscheibe PRO+", amount: 360.00 },  // wrong — off by a row
      { label: "Beide Bremsscheiben erneuern (Hinterachse)", amount: 81.00 },
      { label: "Kühlerfrostschutz", amount: 135.00 },  // wrong
      { label: "Ölfilter", amount: 45.00 },             // wrong
    ];
    // OCR text intentionally omits any "Nettosumme" line.
    const ocrTextWithoutNetto = "Pos Bezeichnung Menge E-Preis Ges. Preis\nGesamt 1.896,53 €";

    const result = finalizeColumnFormatLineItems({
      llmItems: shiftedLlm,
      layoutItems: layoutRows,
      ocrText: ocrTextWithoutNetto,
      grossAmount: null,
    });

    const bremsscheibe = result.lineItems?.find((item) =>
      item.label.includes("Bremsscheibe PRO+"),
    );
    const kuehlerfrost = result.lineItems?.find((item) =>
      item.label.includes("Kühlerfrostschutz"),
    );
    const oelfilter = result.lineItems?.find((item) =>
      item.label.includes("Ölfilter"),
    );

    expect(bremsscheibe?.amount).toBe(331.98);  // layout value, not LLM's 360.00
    expect(kuehlerfrost?.amount).toBe(21.42);   // layout value, not LLM's 135.00
    expect(oelfilter?.amount).toBe(23.86);      // layout value, not LLM's 45.00
  });

  it("does not append shifted LLM rows in strict column merge", () => {
    const layoutRows = [
      { label: "Bremsbelagsatz, Scheibenbremse", amount: 141.46 },
      { label: "Bremsscheibe PRO+", amount: 331.98 },
    ];
    const shiftedLlm = [
      { label: "Bremsbelagsatz, Scheibenbremse", amount: 141.46 },
      { label: "Bremsscheibe PRO+", amount: 360 },
      { label: "Beide Bremsscheiben erneuern", amount: 360 },
    ];

    expect(
      mergeLayoutAndLlmLineItems(shiftedLlm, layoutRows, null, {
        strictColumnMerge: true,
      }),
    ).toEqual(layoutRows);
  });
});
