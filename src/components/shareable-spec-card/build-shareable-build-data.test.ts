import { describe, expect, it } from "vitest";

import { buildShareableBuildData } from "./build-shareable-build-data";

const baseProfile = {
  vehicleId: "v1",
  make: "BMW",
  model: "M2 F87",
  year: 2018,
  powerPs: 480,
  powerKw: null,
  torqueNm: 650,
  accel0To100Sec: null,
  accel100To200Sec: null,
  engine: null,
  displacementCc: null,
  fuelType: null,
  transmission: null,
  drivetrain: null,
  bodyType: null,
  color: null,
  notes: null,
  instagramHandle: null,
  mileageKm: null,
  dynoChartUrl: null,
  dynoChartIsImage: false,
  heroImageSrc: null,
  hideFinancials: false,
  publicSlug: null,
  engineSoundUrl: null,
  buildPersonalityLabels: [],
};

describe("buildShareableBuildData", () => {
  it("returns null when power or torque missing", () => {
    expect(
      buildShareableBuildData({
        profile: { ...baseProfile, powerPs: null },
        modificationsCount: 2,
      }),
    ).toBeNull();
  });

  it("maps showcase profile to card data", () => {
    const data = buildShareableBuildData({
      profile: baseProfile,
      modificationsCount: 12,
      tagUuid: "a1b2c3d4-e5f6-4789-a012-345678901234",
      stockPowerPs: 340,
      curbWeightKg: 1550,
    });

    expect(data?.modelName).toContain("BMW");
    expect(data?.metrics.modsCount).toBe(12);
    expect(data?.metrics.power.delta).toBe("+140 PS");
    expect(data?.v4aTagId).toBe("#ZX-1234");
    expect(data?.metrics.powerToWeight.value).toBe("3.2");
  });
});
