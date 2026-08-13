import { describe, expect, it } from "vitest";

import {
  BLOTZHEIM_EXPECTED_TOTALS,
  BLOTZHEIM_LLM_RAW_LINE_ITEMS,
  BLOTZHEIM_NET_SUM,
} from "@/lib/ocr/fixtures/blotzheim-invoice-line-items";
import { realignShiftedInvoiceLineItems } from "@/lib/ocr/invoice-line-item-alignment";
import {
  extractInvoiceLineItemsFromAzureLayout,
} from "@/lib/ocr/invoice-line-items-from-layout";
import { mergeLayoutAndLlmLineItems } from "@/lib/ocr/invoice-line-items-from-layout";
import { reconcileLineItemAmountsWithOcrText } from "@/lib/ocr/invoice-line-items-from-text";
import { stripNonPositionInvoiceRows } from "@/lib/ocr/invoice-footer-totals";
import type { AzureLayoutAnalyzeResult } from "@/lib/ocr/azure-document-intelligence";
import { processLineItems } from "@/utils/invoiceMath";

/** Simulates shifted vision LLM output on Rechnung 27646 (wrong Ges. Preis column). */
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
    content: "",
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

describe("column invoice extraction pipeline (Blotzheim 27646)", () => {
  it("restores row totals via processLineItems → merge → realign", () => {
    const llmLineItems = processLineItems(SHIFTED_LLM_RAW)
      .filter((item) => item.gesamtpreis > 0)
      .map((item) => ({
        label: String(item.label).trim(),
        amount: item.gesamtpreis,
      }));

    const layoutLineItems = extractInvoiceLineItemsFromAzureLayout(
      buildBlotzheim27646Layout(),
    );
    const merged = mergeLayoutAndLlmLineItems(
      llmLineItems,
      layoutLineItems,
      null,
      { trustedNetTotal: BLOTZHEIM_NET_SUM },
    );
    const realigned = realignShiftedInvoiceLineItems(
      stripNonPositionInvoiceRows(merged),
      BLOTZHEIM_NET_SUM,
    );

    expect(
      realigned!.find((item) => item.label.includes("Beide Bremsscheiben"))!.amount,
    ).toBe(81);
    expect(
      realigned!.find((item) => item.label.includes("Beide Schraubenfedern"))!
        .amount,
    ).toBe(225);
    expect(realigned!.find((item) => item.label.includes("Kühlerfrostschutz"))!.amount).toBe(
      21.42,
    );
    expect(realigned!.find((item) => item.label.includes("Ölfilter"))!.amount).toBe(23.86);

    const billable = BLOTZHEIM_EXPECTED_TOTALS.filter((row) => row.amount > 0);
    expect(realigned).toHaveLength(billable.length);
    expect(realigned!.reduce((sum, item) => sum + item.amount, 0)).toBeCloseTo(
      BLOTZHEIM_NET_SUM,
      2,
    );
  });

  it("reconcileLineItemAmountsWithOcrText upgrades shifted amounts from Pos OCR", () => {
    const ocrText = BLOTZHEIM_LLM_RAW_LINE_ITEMS.map(
      (row, index) =>
        `${index + 1} ${row.label} ${row.menge ?? ""} ${row.einzelpreis ?? ""} ${row.gesamtpreis ?? ""}`,
    ).join("\n");

    const shifted = processLineItems(SHIFTED_LLM_RAW)
      .filter((item) => item.gesamtpreis > 0)
      .map((item) => ({
        label: String(item.label).trim(),
        amount: item.gesamtpreis,
      }));

    const corrected = reconcileLineItemAmountsWithOcrText(shifted, ocrText);
    expect(
      corrected!.find((item) => item.label.includes("Beide Bremsscheiben"))!.amount,
    ).toBe(81);
  });
});
