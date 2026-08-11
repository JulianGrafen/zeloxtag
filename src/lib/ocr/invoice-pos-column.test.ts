import { describe, expect, it } from "vitest";

import { OCR_SAMPLES } from "@/lib/ocr/__fixtures__/ocr-samples";
import {
  TM_MOTORSPORT_NET_SUM,
  TM_MOTORSPORT_OCR_TEXT,
} from "@/lib/ocr/fixtures/tm-motorsport-invoice";
import { extractInvoiceLineItemsFromText } from "@/lib/ocr/invoice-line-items-from-text";
import { ensureInvoiceVatAndGrossTotal } from "@/lib/ocr/invoice-vat";
import {
  findPosColumnSplitStarts,
  ocrTextUsesPosColumnTable,
  splitLineByPosColumn,
  stripPosColumnPrefix,
} from "@/lib/ocr/invoice-pos-column";

describe("invoice-pos-column", () => {
  it("detects DMS Pos tables but not simple Pos/Betrag lists", () => {
    expect(ocrTextUsesPosColumnTable(TM_MOTORSPORT_OCR_TEXT)).toBe(true);
    expect(ocrTextUsesPosColumnTable(OCR_SAMPLES.workshopInvoiceWithTuevMention)).toBe(
      false,
    );
  });

  it("splits glued rows on sequential Pos markers", () => {
    const glued =
      "1 8566434 Fehlersuche Dynamic Drive System 1,63 92,00 149,96 A 2 Änderungsabnahme gemäß §19 1,00 245,29 245,29 0 Gesamtbetrag 423,74";

    expect(findPosColumnSplitStarts(glued)).toEqual([0, expect.any(Number)]);

    const segments = splitLineByPosColumn(glued);
    expect(segments).toHaveLength(2);
    expect(segments[0]).toMatch(/^1 8566434 Fehlersuche/);
    expect(segments[1]).toMatch(/^2 Änderungsabnahme/);
  });

  it("strips Pos and Nummer prefixes from labels", () => {
    expect(
      stripPosColumnPrefix(
        "1 8566434 Fehlersuche Dynamic Drive System / Kabelverbindungen",
      ),
    ).toBe("Fehlersuche Dynamic Drive System / Kabelverbindungen");
    expect(stripPosColumnPrefix("2 Änderungsabnahme gemäß §19")).toBe(
      "Änderungsabnahme gemäß §19",
    );
  });

  it("extracts TM motorsport positions anchored on Pos column", () => {
    const items = extractInvoiceLineItemsFromText(TM_MOTORSPORT_OCR_TEXT);
    expect(items).toHaveLength(2);
    expect(items![0]!.label).toMatch(/Fehlersuche Dynamic Drive System/i);
    expect(items![0]!.amount).toBeCloseTo(149.96, 2);
    expect(items![1]!.label).toMatch(/Änderungsabnahme/i);
    expect(items![1]!.amount).toBeCloseTo(245.29, 2);

    const sum = items!.reduce((acc, item) => acc + item.amount, 0);
    expect(sum).toBeCloseTo(TM_MOTORSPORT_NET_SUM, 2);
  });

  it("extracts simple workshop and oil-change invoices without Pos-column mode", () => {
    const workshop = extractInvoiceLineItemsFromText(
      OCR_SAMPLES.workshopInvoiceWithTuevMention,
    );
    expect(workshop?.map((item) => item.amount)).toEqual([120, 480]);

    const workshopVat = ensureInvoiceVatAndGrossTotal({
      lineItems: workshop,
      amount: 714,
      ocrText: OCR_SAMPLES.workshopInvoiceWithTuevMention,
    });
    expect(workshopVat.amount).toBe(714);
    expect(workshopVat.lineItems!.filter((item) => /mwst/i.test(item.label))).toHaveLength(
      1,
    );

    const oil = extractInvoiceLineItemsFromText(OCR_SAMPLES.oilChangeInvoice);
    expect(oil?.map((item) => item.amount)).toEqual([89, 18.5, 45]);

    const oilVat = ensureInvoiceVatAndGrossTotal({
      lineItems: oil,
      amount: 181.48,
      ocrText: OCR_SAMPLES.oilChangeInvoice,
    });
    expect(oilVat.amount).toBeCloseTo(181.48, 2);
    expect(
      oilVat.lineItems!.find((item) => /mwst/i.test(item.label))!.amount,
    ).toBeCloseTo(28.98, 2);
  });
});
