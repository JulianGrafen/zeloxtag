import { describe, expect, it } from "vitest";

import {
  computeNextIntervals,
  QUICK_CHIP_CATEGORIES,
  serviceCategoryPreset,
} from "./category-presets";

describe("QUICK_CHIP_CATEGORIES", () => {
  it("follows workshop display order", () => {
    expect(QUICK_CHIP_CATEGORIES.map((c) => serviceCategoryPreset(c).label)).toEqual([
      "Ölwechsel",
      "Inspektion",
      "Luftfilter",
      "Innenraumfilter",
      "Zündkerzen",
      "Getriebeöl",
      "Bremsflüssigkeit",
      "Bremsen vorne",
      "Bremsen hinten",
    ]);
  });
});

describe("serviceCategoryPreset", () => {
  it("uses vehicle oil interval from specs", () => {
    const preset = serviceCategoryPreset("oil_change", {
      oilChangeIntervalKm: 15_000,
      oilChangeIntervalMonths: 18,
    });
    expect(preset.intervalKm).toBe(15_000);
    expect(preset.intervalMonths).toBe(18);
  });

  it("computes next mileage and calendar date", () => {
    const next = computeNextIntervals({
      category: "spark_plugs",
      serviceDate: "2024-06-01",
      mileageKm: 80_000,
    });
    expect(next.nextIntervalMileage).toBe(110_000);
    expect(next.nextIntervalDate).toBe("2028-06-01");
  });
});
