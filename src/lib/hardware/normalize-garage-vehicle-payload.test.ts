import { describe, expect, it } from "vitest";

import { normalizeGarageVehiclePayload } from "@/lib/hardware/normalize-garage-vehicle-payload";

describe("normalizeGarageVehiclePayload", () => {
  it("returns pending garage shape with empty email for OAuth staging", () => {
    const payload = normalizeGarageVehiclePayload({
      make: "Toyota",
      model: "GR Supra",
      year: "2022",
      name: "Max",
    });

    expect(payload.email).toBe("");
    expect(payload.make).toBe("Toyota");
    expect(payload.year).toBe(2022);
    expect(payload.name).toBe("Max");
  });
});
