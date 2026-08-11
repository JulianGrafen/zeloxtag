import { describe, expect, it } from "vitest";

import {
  TM_MOTORSPORT_BAD_LLM_ITEMS,
  TM_MOTORSPORT_GROSS,
  TM_MOTORSPORT_NET_SUM,
  TM_MOTORSPORT_OCR_TEXT,
  TM_MOTORSPORT_VAT,
} from "@/lib/ocr/fixtures/tm-motorsport-invoice";
import {
  checkInvoicePlausibility,
  reconcileInvoicePlausibility,
} from "@/lib/ocr/invoice-plausibility";
import { ensureInvoiceVatAndGrossTotal } from "@/lib/ocr/invoice-vat";

describe("invoice-plausibility", () => {
  it("flags shifted LLM rows that break the net sum checksum", () => {
    const check = checkInvoicePlausibility({
      lineItems: [...TM_MOTORSPORT_BAD_LLM_ITEMS],
      amount: TM_MOTORSPORT_GROSS,
      ocrText: TM_MOTORSPORT_OCR_TEXT,
    });

    expect(check.plausible).toBe(false);
    expect(check.issues).toContain("positions_net_mismatch");
    expect(check.issues).toContain("footer_row_as_position");
    expect(check.issues).toContain("implausible_vat_line");
    expect(check.snapshot.footerNet).toBe(TM_MOTORSPORT_NET_SUM);
    expect(check.snapshot.footerGross).toBe(TM_MOTORSPORT_GROSS);
  });

  it("reconciles positions and gross total against footer checksums", () => {
    const reconciled = reconcileInvoicePlausibility({
      lineItems: [...TM_MOTORSPORT_BAD_LLM_ITEMS],
      amount: TM_MOTORSPORT_GROSS,
      ocrText: TM_MOTORSPORT_OCR_TEXT,
    });

    expect(reconciled.check.plausible).toBe(true);
    expect(reconciled.amount).toBe(TM_MOTORSPORT_GROSS);
    expect(reconciled.lineItems).toHaveLength(2);
    expect(reconciled.lineItems![0]!.amount).toBeCloseTo(149.96, 2);
    expect(
      reconciled.lineItems!.some((item) => Math.abs(item.amount - 245.29) < 0.01),
    ).toBe(true);

    const sum = reconciled.lineItems!.reduce((acc, item) => acc + item.amount, 0);
    expect(sum).toBeCloseTo(TM_MOTORSPORT_NET_SUM, 2);
  });

  it("rejects glued OCR rows that leak Gesamtbetrag into line items", () => {
    const gluedOcr = `
Pos Bezeichnung Menge E-Preis Ges. Preis St.
1 Fehlersuche Dynamic Drive System 1,63 92,00 149,96 A 2 Änderungsabnahme gemäß §19 1,00 245,29 245,29 0 Gesamtbetrag 423,74
Nettosumme 395,25
MwSt (19 % (A)) 28,49
Gesamtbetrag 423,74
`.trim();

    const llmGross = [
      { label: "Fehlersuche Dynamic Drive System", amount: 423.74 },
      { label: "Änderungsabnahme gemäß §19 Abs. 3", amount: 423.74 },
    ];

    const reconciled = reconcileInvoicePlausibility({
      lineItems: llmGross,
      amount: TM_MOTORSPORT_GROSS,
      ocrText: gluedOcr,
    });

    expect(reconciled.lineItems).toHaveLength(2);
    expect(reconciled.lineItems!.every((item) => item.amount < 300)).toBe(true);

    const withVat = ensureInvoiceVatAndGrossTotal({
      lineItems: reconciled.lineItems,
      amount: reconciled.amount,
      ocrText: gluedOcr,
    });

    expect(withVat.amount).toBe(TM_MOTORSPORT_GROSS);
    expect(
      withVat.lineItems!.find((item) => /mwst/i.test(item.label))!.amount,
    ).toBeCloseTo(TM_MOTORSPORT_VAT, 2);
  });

  it("passes through ensureInvoiceVatAndGrossTotal after reconciliation", () => {
    const reconciled = reconcileInvoicePlausibility({
      lineItems: [...TM_MOTORSPORT_BAD_LLM_ITEMS],
      amount: TM_MOTORSPORT_GROSS,
      ocrText: TM_MOTORSPORT_OCR_TEXT,
    });

    const withVat = ensureInvoiceVatAndGrossTotal({
      lineItems: reconciled.lineItems,
      amount: reconciled.amount,
      ocrText: TM_MOTORSPORT_OCR_TEXT,
    });

    expect(withVat.amount).toBe(TM_MOTORSPORT_GROSS);
    expect(withVat.lineItems).toHaveLength(3);
    expect(
      withVat.lineItems!.find((item) => /mwst/i.test(item.label))!.amount,
    ).toBeCloseTo(TM_MOTORSPORT_VAT, 2);
  });

  it("accepts consistent positions without OCR footer", () => {
    const check = checkInvoicePlausibility({
      lineItems: [
        { label: "Bremsbeläge", amount: 100 },
        { label: "Arbeitslohn", amount: 50 },
      ],
      amount: 178.5,
    });

    expect(check.plausible).toBe(true);
    expect(check.issues).toHaveLength(0);
    expect(check.snapshot.positionNetSum).toBe(150);
  });
});
