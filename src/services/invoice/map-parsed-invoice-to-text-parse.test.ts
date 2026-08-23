import { describe, expect, it } from "vitest";

import { mapParsedInvoiceToTextParseResult } from "@/services/invoice/map-parsed-invoice-to-text-parse";
import type { ParsedInvoice } from "@/types/invoice";

function buildParsedInvoice(
  overrides: Partial<ParsedInvoice> = {},
): ParsedInvoice {
  return {
    vendor_name: "Blotzheim Performance",
    invoice_number: "27646",
    invoice_date: "2026-01-15",
    vehicle: {
      vin: "WVWZZZ1KZAW123456",
      hsn_tsn: null,
      license_plate: "FR-AB 1234",
      mileage: 142350,
    },
    totals: {
      net_amount: 554.44,
      vat_amount: 105.34,
      gross_amount: 659.78,
    },
    line_items: [
      {
        description: "Bremsbelagsatz",
        quantity: 1,
        unit_price: 141.46,
        total_price: 141.46,
        is_math_valid: true,
      },
      {
        description: "Bremsscheibe PRO+",
        quantity: 2,
        unit_price: 165.99,
        total_price: 331.98,
        is_math_valid: true,
      },
    ],
    reconciliation: {
      line_items_net_sum: 473.44,
      line_items_count: 2,
      net_delta: 81,
      gross_delta: null,
      vat_delta: 0,
      net_reconciled: false,
      gross_reconciled: true,
      vat_reconciled: true,
    },
    ...overrides,
  };
}

describe("mapParsedInvoiceToTextParseResult", () => {
  it("maps hybrid invoice fields to UI parse result", () => {
    const markdown = [
      "Blotzheim Performance GmbH",
      "Rechnung Nr. 27646",
      "Kilometerstand: 142.350 km",
      "Bremsbelagsatz 141,46",
      "Bremsscheibe PRO+ 331,98",
      "Nettosumme 554,44",
      "MwSt 105,34",
      "Gesamtbetrag 659,78",
    ].join("\n");

    const mapped = mapParsedInvoiceToTextParseResult(buildParsedInvoice(), {
      rawMarkdown: markdown,
    });

    expect(mapped.vendor).toBe("Blotzheim Performance GmbH");
    expect(mapped.invoiceNumber).toBe("27646");
    expect(mapped.date).toBe("2026-01-15");
    expect(mapped.amount).toBe(659.78);
    expect(mapped.mileageKm).toBe(142350);
    expect(mapped.lineItems).toEqual([
      { label: "Bremsbelagsatz", amount: 141.46 },
      { label: "Bremsscheibe PRO+", amount: 331.98 },
    ]);
    expect(mapped.summary).toBeTruthy();
    expect(mapped.kbaNumber).toBeNull();
  });

  it("respects locked scan category", () => {
    const mapped = mapParsedInvoiceToTextParseResult(buildParsedInvoice(), {
      rawMarkdown: "Rechnung Reparatur Bremsen",
      lockedCategory: "repair",
    });

    expect(mapped.category).toBe("repair");
  });

  it("prefers visionVendor from logo over hybrid text vendor_name", () => {
    const mapped = mapParsedInvoiceToTextParseResult(
      buildParsedInvoice({ vendor_name: null }),
      {
        rawMarkdown: "Rechnung\nDatum 15.01.2026",
        visionVendor: "Wagner Tuning",
      },
    );

    expect(mapped.vendor).toBe("Wagner Tuning");
  });
});
