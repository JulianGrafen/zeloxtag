import { describe, expect, it } from "vitest";

import { isPlaqueTagUuid } from "@/lib/tags/plaque-qr";

describe("vehicle id vs tag scan URLs", () => {
  it("treats vehicle UUID shape like tag UUID shape", () => {
    const vehicleId = "a1b2c3d4-e5f6-4789-a012-3456789abcde";
    expect(isPlaqueTagUuid(vehicleId)).toBe(true);
  });
});
