import { describe, expect, it } from "vitest";

import { parseHybridInvoiceLlmResponse } from "@/services/invoice/parse-hybrid-invoice-response";
import {
  reconcileInvoiceTotals,
  validateAndFixLineItems,
} from "@/services/invoice/InvoiceMathValidator";

describe("parseHybridInvoiceLlmResponse", () => {
  it("maps LLM JSON to ParsedInvoice draft and derives gross from net+vat", () => {
    const draft = parseHybridInvoiceLlmResponse({
      vendor_name: "Frank Blotzheim",
      invoice_number: "27646",
      invoice_date: "2026-02-05",
      vehicle: {
        vin: "WVWZZZ1JZ3W386752",
        hsn_tsn: "0005/ABC",
        license_plate: "HD-AB 123",
        mileage: 142350,
      },
      totals: {
        net_amount: 141.46,
        vat_amount: 26.88,
        gross_amount: null,
      },
      line_items: [
        {
          description: "Bremsbelagsatz, Scheibenbremse",
          quantity: 1,
          unit_price: 141.46,
          total_price: 141.46,
        },
      ],
    });

    expect(draft.totals.gross_amount).toBeCloseTo(168.34, 2);
    expect(draft.vehicle.mileage).toBe(142350);

    const validated = validateAndFixLineItems(draft.line_items);
    expect(validated[0]!.is_math_valid).toBe(true);

    const reconciled = reconcileInvoiceTotals({ ...draft, line_items: validated });
    expect(reconciled.reconciliation.line_items_net_sum).toBe(141.46);
    expect(reconciled.reconciliation.net_reconciled).toBe(true);
  });

  it("strips HTML tags from vendor and line item text", () => {
    const draft = parseHybridInvoiceLlmResponse({
      vendor_name: "<figure><span>Blotzheim Performance GmbH</span></figure>",
      invoice_number: "27646",
      invoice_date: "2026-02-05",
      vehicle: {
        vin: null,
        hsn_tsn: null,
        license_plate: null,
        mileage: null,
      },
      totals: {
        net_amount: 100,
        vat_amount: 19,
        gross_amount: 119,
      },
      line_items: [
        {
          description: "<td>Bremsscheibe PRO+</td>",
          quantity: 1,
          unit_price: 100,
          total_price: 100,
        },
      ],
    });

    expect(draft.vendor_name).toBe("Blotzheim Performance GmbH");
    expect(draft.line_items[0]!.description).toBe("Bremsscheibe PRO+");
  });
});
