import { describe, expect, it } from "vitest";

import {
  BLOTZHEIM_EXPECTED_TOTALS,
  BLOTZHEIM_LLM_RAW_LINE_ITEMS,
  BLOTZHEIM_NET_SUM,
} from "@/lib/ocr/fixtures/blotzheim-invoice-line-items";
import type { AzureLayoutAnalyzeResult } from "@/lib/ocr/azure-document-intelligence";
import { parseHybridInvoiceLlmResponse } from "@/services/invoice/parse-hybrid-invoice-response";
import { reconcileHybridInvoiceLineItems } from "@/services/invoice/reconcile-hybrid-line-items";

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

function parseGermanMoney(value: string | null): number | null {
  if (!value) return null;
  const clean = value.replace(/[^0-9,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const num = Number.parseFloat(clean);
  return Number.isFinite(num) ? num : null;
}

function parseGermanQty(value: string | null): number {
  if (!value) return 1;
  const match = value.match(/(\d+[.,]\d+|\d+)/);
  if (!match) return 1;
  return Number.parseFloat(match[1]!.replace(",", "."));
}

describe("reconcileHybridInvoiceLineItems", () => {
  it("corrects partially shifted prices on Blotzheim 27646", () => {
    const draft = parseHybridInvoiceLlmResponse({
      vendor_name: "Blotzheim",
      invoice_number: "27646",
      invoice_date: "2026-02-05",
      vehicle: {
        vin: null,
        hsn_tsn: null,
        license_plate: null,
        mileage: null,
      },
      totals: {
        net_amount: BLOTZHEIM_NET_SUM,
        vat_amount: 354.87,
        gross_amount: 2222.6,
      },
      line_items: SHIFTED_LLM_RAW.filter((row) => row.gesamtpreis).map((row) => ({
        description: row.label,
        quantity: parseGermanQty(row.menge),
        unit_price: parseGermanMoney(row.einzelpreis),
        total_price: parseGermanMoney(row.gesamtpreis)!,
      })),
    });

    const markdown = [
      "Pos Bezeichnung Menge E-Preis Ges. Preis",
      ...BLOTZHEIM_LLM_RAW_LINE_ITEMS.map(
        (row, index) =>
          `${index + 1} ${row.label} ${row.menge ?? ""} ${row.einzelpreis ?? ""} ${row.gesamtpreis ?? ""}`,
      ),
      `Nettosumme ${BLOTZHEIM_NET_SUM.toFixed(2).replace(".", ",")} €`,
      "Gesamtbetrag 2.222,60 €",
    ].join("\n");

    const corrected = reconcileHybridInvoiceLineItems({
      draftItems: draft.line_items,
      markdown,
      layout: buildBlotzheim27646Layout(),
      grossAmount: 2222.6,
    });

    expect(
      corrected.find((item) => item.description.includes("Beide Bremsscheiben"))!
        .total_price,
    ).toBe(81);
    expect(
      corrected.find((item) => item.description.includes("Beide Schraubenfedern"))!
        .total_price,
    ).toBe(225);
    expect(
      corrected.find((item) => item.description.includes("Kühlerfrostschutz"))!
        .total_price,
    ).toBe(21.42);
    expect(
      corrected.find((item) => item.description.includes("Ölfilter"))!.total_price,
    ).toBe(23.86);

    const billable = BLOTZHEIM_EXPECTED_TOTALS.filter((row) => row.amount > 0);
    const billableCorrected = corrected.filter(
      (item) => !/mwst/i.test(item.description),
    );
    expect(billableCorrected).toHaveLength(billable.length);
    expect(
      billableCorrected.reduce((sum, item) => sum + item.total_price, 0),
    ).toBeCloseTo(BLOTZHEIM_NET_SUM, 2);
  });
});
