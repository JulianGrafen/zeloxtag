import { describe, expect, it } from "vitest";

import { extractServicePartNumberFromLineItems } from "./extract-service-part-number";

describe("extractServicePartNumberFromLineItems", () => {
  it("extracts brake part number from labeled line", () => {
    const part = extractServicePartNumberFromLineItems(
      [{ label: "Bremsbeläge VA Art.-Nr. 34116851147", amount: 120 }],
      "brake_pads",
    );
    expect(part).toBe("34116851147");
  });

  it("extracts oil-related part from filter line", () => {
    const part = extractServicePartNumberFromLineItems(
      [{ label: "Ölfilter Sachnummer: 15208-65F0E", amount: 18 }],
      "oil_change",
    );
    expect(part).toBe("15208-65F0E");
  });

  it("returns null for unrelated lines", () => {
    const part = extractServicePartNumberFromLineItems(
      [{ label: "Arbeitslohn", amount: 90 }],
      "brake_pads",
    );
    expect(part).toBeNull();
  });
});
