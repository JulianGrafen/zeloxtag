import { describe, expect, it } from "vitest";

import { parseHybridInvoiceLlmResponse } from "@/services/invoice/parse-hybrid-invoice-response";
import { validateAndFixLineItems } from "@/services/invoice/InvoiceMathValidator";

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
        net_amount: 1867.73,
        vat_amount: 354.87,
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

    expect(draft.totals.gross_amount).toBeCloseTo(2222.6, 2);
    expect(draft.vehicle.mileage).toBe(142350);

    const validated = validateAndFixLineItems(draft.line_items);
    expect(validated[0]!.is_math_valid).toBe(true);
  });
});
