import { describe, expect, it } from "vitest";

import { formatPublicVehicleTitle } from "./format-public-vehicle-title";

describe("formatPublicVehicleTitle", () => {
  it("joins make and model when distinct", () => {
    expect(formatPublicVehicleTitle("BMW", "530d")).toBe("BMW 530d");
  });

  it("avoids repeating make when model already includes it", () => {
    expect(formatPublicVehicleTitle("BMW", "BMW 530d")).toBe("BMW 530d");
    expect(formatPublicVehicleTitle("BMW", "BMW-530d")).toBe("BMW-530d");
  });

  it("returns model or make when the other is missing", () => {
    expect(formatPublicVehicleTitle(null, "530d")).toBe("530d");
    expect(formatPublicVehicleTitle("BMW", null)).toBe("BMW");
  });
});
