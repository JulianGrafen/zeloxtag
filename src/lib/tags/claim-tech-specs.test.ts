import { describe, expect, it } from "vitest";

import {
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
    });
    expect(
      hasClaimTechSpecs(
        normalizeClaimTechSpecs({
          powerPs: "170",
        }),
      ),
    ).toBe(true);
  });
});
