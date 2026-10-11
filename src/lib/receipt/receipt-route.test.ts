import { describe, expect, it } from "vitest";

import { receiptKindToRouteTarget } from "@/lib/receipt/receipt-route";

describe("receiptKindToRouteTarget", () => {
  it("maps fuel and workshop kinds", () => {
    expect(receiptKindToRouteTarget("fuel_receipt")).toBe("fuel");
    expect(receiptKindToRouteTarget("workshop_invoice")).toBe("workshop");
    expect(receiptKindToRouteTarget("uncertain")).toBeNull();
  });
});
