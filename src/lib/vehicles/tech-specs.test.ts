import { describe, expect, it } from "vitest";

import {
  countFilledTechSpecs,
  parseVehicleTechSpecs,
  serializeVehicleTechSpecs,
} from "@/lib/vehicles/tech-specs";

describe("vehicle tech specs", () => {
  it("parses and serializes compact payloads", () => {
    const parsed = parseVehicleTechSpecs({
      engine: " 1.3 Renesis ",
      powerPs: "231",
      fuelType: "Benzin",
      notes: "",
    });
    expect(parsed.engine).toBe("1.3 Renesis");
    expect(parsed.powerPs).toBe(231);
    expect(parsed.notes).toBeNull();

    const serialized = serializeVehicleTechSpecs(parsed);
    expect(serialized).toEqual({
      engine: "1.3 Renesis",
      powerPs: 231,
      fuelType: "Benzin",
    });
    expect(countFilledTechSpecs(parsed)).toBe(3);
  });
});
