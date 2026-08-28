import { describe, expect, it } from "vitest";

import { parseLineItems } from "@/lib/documents/line-items";

describe("parseLineItems", () => {
  it("persists reviewed line items 1:1 from JSON", () => {
    const reviewed = [
      { label: "Beide Bremsscheiben erneuern (Hinterachse)", amount: 81 },
      { label: "Bremsbelagsatz, Scheibenbremse", amount: 141.46 },
    ];

    expect(parseLineItems(JSON.stringify(reviewed))).toEqual(reviewed);
  });

  it("round-trips FormData-style JSON without recomputing amounts", () => {
    const reviewed = [
      { label: "Arbeitslohn 0,90 Std", amount: 81 },
      { label: "Ölfilter", amount: 23.86 },
    ];
    const serialized = JSON.stringify(reviewed);

    expect(parseLineItems(serialized)).toEqual(reviewed);
    expect(parseLineItems(JSON.parse(serialized))).toEqual(reviewed);
  });
});
