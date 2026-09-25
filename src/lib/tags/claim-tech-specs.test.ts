import { describe, expect, it } from "vitest";

import { DEFAULT_OIL_INTERVAL_MONTHS } from "@/lib/documents/oil-changes";
import {
  claimTechSpecsToVehicleSpecs,
  hasClaimTechSpecs,
  normalizeClaimTechSpecs,
} from "@/lib/tags/claim-tech-specs";

describe("claim-tech-specs", () => {
  it("returns null when no optional specs were provided", () => {
    expect(normalizeClaimTechSpecs(undefined)).toBeNull();
    expect(normalizeClaimTechSpecs({})).toBeNull();
    expect(hasClaimTechSpecs(null)).toBe(false);
  });

  it("normalizes numeric and enum-like values", () => {
    expect(
      normalizeClaimTechSpecs({
        powerPs: "231",
        displacementCc: "2998",
        drivetrain: "Heckantrieb",
        fuelType: "Benzin",
      }),
    ).toEqual({
      powerPs: 231,
      displacementCc: 2998,
      drivetrain: "Heckantrieb",
      fuelType: "Benzin",
      oilChangeIntervalKm: null,
      oilChangeIntervalMonths: null,
      buildPersonalityTags: [],
    });
    expect(
      hasClaimTechSpecs(
        normalizeClaimTechSpecs({
          powerPs: "170",
        }),
      ),
    ).toBe(true);
  });

  it("normalizes oil-change interval km from claim input", () => {
    expect(
      normalizeClaimTechSpecs({
        oilChangeIntervalKm: "15000",
      }),
    ).toEqual({
      powerPs: null,
      displacementCc: null,
      drivetrain: null,
      fuelType: null,
      oilChangeIntervalKm: 15_000,
      oilChangeIntervalMonths: DEFAULT_OIL_INTERVAL_MONTHS,
      buildPersonalityTags: [],
    });
    expect(
      normalizeClaimTechSpecs({
        oilChangeIntervalKm: "15000",
        oilChangeIntervalMonths: "18",
      }),
    ).toEqual({
      powerPs: null,
      displacementCc: null,
      drivetrain: null,
      fuelType: null,
      oilChangeIntervalKm: 15_000,
      oilChangeIntervalMonths: 18,
      buildPersonalityTags: [],
    });
    expect(
      normalizeClaimTechSpecs({
        oilChangeIntervalKm: "9999",
      }),
    ).toBeNull();
    expect(
      hasClaimTechSpecs(normalizeClaimTechSpecs({ oilChangeIntervalKm: "10000" })),
    ).toBe(true);
  });

  it("maps claim oil interval into vehicle tech_specs payload", () => {
    const specs = normalizeClaimTechSpecs({ oilChangeIntervalKm: "12500" });
    expect(claimTechSpecsToVehicleSpecs(specs)).toEqual({
      oilChangeIntervalKm: 12_500,
      oilChangeIntervalMonths: DEFAULT_OIL_INTERVAL_MONTHS,
    });
  });

  it("normalizes build personality tags only", () => {
    expect(
      normalizeClaimTechSpecs({
        buildPersonalityTags: ["sleeper", "groschengrab", "nope"],
      }),
    ).toEqual({
      powerPs: null,
      displacementCc: null,
      drivetrain: null,
      fuelType: null,
      oilChangeIntervalKm: null,
      oilChangeIntervalMonths: null,
      buildPersonalityTags: ["sleeper", "groschengrab"],
    });
    expect(
      claimTechSpecsToVehicleSpecs(
        normalizeClaimTechSpecs({
          buildPersonalityTags: ["oem_plus"],
        }),
      ),
    ).toEqual({
      buildPersonalityTags: ["oem_plus"],
    });
  });
});
