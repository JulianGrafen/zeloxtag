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

  it("parses JSON-string tech_specs including dynoChartUrl", () => {
    const parsed = parseVehicleTechSpecs(
      JSON.stringify({
        powerPs: 320,
        dynoChartUrl:
          "https://example.supabase.co/storage/v1/object/public/vehicle-documents/11111111-1111-4111-8111-111111111111/dyno-chart.pdf?v=1",
      }),
    );
    expect(parsed.powerPs).toBe(320);
    expect(parsed.dynoChartUrl).toContain("dyno-chart.pdf");
  });
});
