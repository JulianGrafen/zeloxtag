import { describe, expect, it } from "vitest";

import {
  INVOICE_LINE_MATH_TOLERANCE_EUR,
  INVOICE_TOTAL_TOLERANCE_EUR,
  reconcileInvoiceTotals,
  sumBillableLineItemTotals,
  validateAndFixLineItems,
} from "@/services/invoice/InvoiceMathValidator";
import type { ParsedInvoice } from "@/types/invoice";

function buildInvoice(
  lineItems: ParsedInvoice["line_items"],
  totals: ParsedInvoice["totals"],
): Omit<ParsedInvoice, "reconciliation"> {
  return {
    vendor_name: "Test",
    invoice_number: "123",
    invoice_date: "2026-02-05",
    vehicle: {
      vin: null,
      hsn_tsn: null,
      license_plate: null,
      mileage: null,
    },
    totals,
    line_items: lineItems,
  };
}

describe("validateAndFixLineItems", () => {
  it("defaults quantity to 1 when missing or zero", () => {
    const [fixed] = validateAndFixLineItems([
      {
        description: "Ölfilter",
        quantity: 0,
        unit_price: 23.86,
        total_price: 23.86,
      },
    ]);

    expect(fixed!.quantity).toBe(1);
    expect(fixed!.is_math_valid).toBe(true);
  });

  it("derives unit_price from total_price / quantity", () => {
    const [fixed] = validateAndFixLineItems([
      {
        description: "Bremsscheibe PRO+",
        quantity: 2,
        unit_price: null,
        total_price: 331.98,
      },
    ]);

    expect(fixed!.unit_price).toBe(165.99);
    expect(fixed!.is_math_valid).toBe(true);
  });

  it("marks row invalid when math drifts beyond tolerance", () => {
    const [fixed] = validateAndFixLineItems([
      {
        description: "Shifted row",
        quantity: 1,
        unit_price: 90,
        total_price: 360,
      },
    ]);

    expect(fixed!.is_math_valid).toBe(false);
  });

  it("accepts fractional labor quantities (Blotzheim: 0.90 × 90 = 81)", () => {
    const [fixed] = validateAndFixLineItems([
      {
        description: "Beide Bremsscheiben erneuern (Hinterachse)",
        quantity: 0.9,
        unit_price: 90,
        total_price: 81,
      },
    ]);

    expect(fixed!.is_math_valid).toBe(true);
  });

  it("uses tolerance boundary from INVOICE_LINE_MATH_TOLERANCE_EUR", () => {
    const within = validateAndFixLineItems([
      {
        description: "Rounding edge",
        quantity: 3,
        unit_price: 7.14,
        total_price: 21.42,
      },
    ]);
    expect(within[0]!.is_math_valid).toBe(true);
    expect(INVOICE_LINE_MATH_TOLERANCE_EUR).toBe(0.05);
  });
});

describe("reconcileInvoiceTotals", () => {
  it("sums all billable positions and reconciles with Blotzheim net total", () => {
    const positions = [
      { description: "Bremsbelagsatz", quantity: 1, unit_price: 141.46, total_price: 141.46, is_math_valid: true },
      { description: "Bremsscheibe PRO+", quantity: 2, unit_price: 165.99, total_price: 331.98, is_math_valid: true },
      { description: "Arbeitslohn", quantity: 0.9, unit_price: 90, total_price: 81, is_math_valid: true },
    ];

    expect(sumBillableLineItemTotals(positions)).toBe(554.44);

    const reconciled = reconcileInvoiceTotals(
      buildInvoice(positions, {
        net_amount: 554.44,
        vat_amount: 105.34,
        gross_amount: 659.78,
      }),
    );

    expect(reconciled.reconciliation.line_items_net_sum).toBe(554.44);
    expect(reconciled.reconciliation.net_reconciled).toBe(true);
    expect(reconciled.reconciliation.gross_reconciled).toBe(true);
    expect(reconciled.reconciliation.vat_reconciled).toBe(true);
    expect(reconciled.reconciliation.net_delta).toBeLessThanOrEqual(
      INVOICE_TOTAL_TOLERANCE_EUR,
    );
  });

  it("excludes MwSt line from position sum", () => {
    const positions = [
      { description: "Teil A", quantity: 1, unit_price: 100, total_price: 100, is_math_valid: true },
      { description: "MwSt 19%", quantity: 1, unit_price: 19, total_price: 19, is_math_valid: true },
    ];

    expect(sumBillableLineItemTotals(positions)).toBe(100);

    const reconciled = reconcileInvoiceTotals(
      buildInvoice(positions, {
        net_amount: 100,
        vat_amount: 19,
        gross_amount: 119,
      }),
    );

    expect(reconciled.reconciliation.line_items_net_sum).toBe(100);
    expect(reconciled.reconciliation.net_reconciled).toBe(true);
  });

  it("flags mismatch when position sum drifts from net total", () => {
    const reconciled = reconcileInvoiceTotals(
      buildInvoice(
        [
          { description: "Shifted", quantity: 1, unit_price: 90, total_price: 360, is_math_valid: false },
        ],
        { net_amount: 81, vat_amount: 15.39, gross_amount: 96.39 },
      ),
    );

    expect(reconciled.reconciliation.net_reconciled).toBe(false);
    expect(reconciled.reconciliation.net_delta).toBeGreaterThan(
      INVOICE_TOTAL_TOLERANCE_EUR,
    );
  });
});
