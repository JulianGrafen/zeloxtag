import { describe, expect, it } from "vitest";

import {
  countFilledTechSpecs,
  formatAccelSecondsDe,
  formatOilChangeIntervalMonthsLabel,
  parseAccelSeconds,
  isOilChangeIntervalKmOption,
  isOilChangeIntervalMonthsOption,
  OIL_CHANGE_INTERVAL_KM_OPTIONS,
  OIL_CHANGE_INTERVAL_MONTHS_OPTIONS,
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

  it("normalizes legacy fuel type strings", () => {
    expect(parseVehicleTechSpecs({ fuelType: "benzin" }).fuelType).toBe(
      "Benzin",
    );
    expect(parseVehicleTechSpecs({ fuelType: "autogas" }).fuelType).toBe("LPG");
    expect(parseVehicleTechSpecs({ fuelType: "Hybrid" }).fuelType).toBe(
      "Hybrid",
    );
  });

  it("normalizes legacy drivetrain strings", () => {
    expect(parseVehicleTechSpecs({ drivetrain: "awd" }).drivetrain).toBe(
      "Allradantrieb",
    );
    expect(parseVehicleTechSpecs({ drivetrain: "rwd" }).drivetrain).toBe(
      "Heckantrieb",
    );
    expect(parseVehicleTechSpecs({ drivetrain: "Mittelmotor" }).drivetrain).toBe(
      "Mittelmotor",
    );
  });

  it("builds oil-change km options in 2.500 km steps", () => {
    expect(OIL_CHANGE_INTERVAL_KM_OPTIONS[0]).toBe(2_500);
    expect(OIL_CHANGE_INTERVAL_KM_OPTIONS).toContain(10_000);
    expect(OIL_CHANGE_INTERVAL_KM_OPTIONS.at(-1)).toBe(50_000);
    expect(isOilChangeIntervalKmOption(10_000)).toBe(true);
    expect(isOilChangeIntervalKmOption(9_999)).toBe(false);
  });

  it("builds oil-change month options in 1-month steps", () => {
    expect(OIL_CHANGE_INTERVAL_MONTHS_OPTIONS[0]).toBe(1);
    expect(OIL_CHANGE_INTERVAL_MONTHS_OPTIONS).toContain(12);
    expect(OIL_CHANGE_INTERVAL_MONTHS_OPTIONS.at(-1)).toBe(36);
    expect(isOilChangeIntervalMonthsOption(12)).toBe(true);
    expect(isOilChangeIntervalMonthsOption(37)).toBe(false);
    expect(formatOilChangeIntervalMonthsLabel(1)).toBe("1 Monat");
    expect(formatOilChangeIntervalMonthsLabel(12)).toBe("12 Monate");
  });

  it("parses acceleration times with bounds and German formatting", () => {
    expect(parseAccelSeconds("5,2", 1, 30)).toBe(5.2);
    expect(parseAccelSeconds("5.2", 1, 30)).toBe(5.2);
    expect(parseAccelSeconds(0.9, 1, 30)).toBeNull();
    expect(parseAccelSeconds(31, 1, 30)).toBeNull();

    const parsed = parseVehicleTechSpecs({
      accel0To100Sec: "6,8",
      accel100To200Sec: 14.2,
    });
    expect(parsed.accel0To100Sec).toBe(6.8);
    expect(parsed.accel100To200Sec).toBe(14.2);
    expect(formatAccelSecondsDe(6.8)).toBe("6,8 s");

    const serialized = serializeVehicleTechSpecs(parsed);
    expect(serialized).toEqual({
      accel0To100Sec: 6.8,
      accel100To200Sec: 14.2,
    });
  });

  it("parses and clamps oil-change interval fields", () => {
    const parsed = parseVehicleTechSpecs({
      oilChangeIntervalKm: 15_000,
      oilChangeIntervalMonths: 24,
    });
    expect(parsed.oilChangeIntervalKm).toBe(15_000);
    expect(parsed.oilChangeIntervalMonths).toBe(24);

    expect(
      parseVehicleTechSpecs({ oilChangeIntervalKm: 500 }).oilChangeIntervalKm,
    ).toBeNull();
    expect(
      parseVehicleTechSpecs({ oilChangeIntervalKm: 9_999 }).oilChangeIntervalKm,
    ).toBeNull();
    expect(
      parseVehicleTechSpecs({ oilChangeIntervalMonths: 48 }).oilChangeIntervalMonths,
    ).toBeNull();

    const serialized = serializeVehicleTechSpecs(parsed);
    expect(serialized).toEqual({
      oilChangeIntervalKm: 15_000,
      oilChangeIntervalMonths: 24,
    });
  });
});
