import { describe, expect, it } from "vitest";

import { BUILD_DNA_RADAR_CATEGORIES } from "@/lib/showcase/build-dna-schema";
import type { ShowcaseBuildDna } from "@/lib/showcase/build-dna-schema";

import { buildShareableBuildData } from "./build-shareable-build-data";

const baseProfile = {
  vehicleId: "v1",
  make: "BMW",
  model: "M2 F87",
  year: 2018,
  powerPs: 480,
  powerKw: null,
  torqueNm: 650,
  accel0To100Sec: 4.2,
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

const mockBuildDna: ShowcaseBuildDna = {
  version: 2,
  archetype: "Streckenwaffe",
  punchline: "Gebaut für die Runde.",
  radar: BUILD_DNA_RADAR_CATEGORIES.map((category, index) => ({
    category,
    score: 40 + index * 10,
  })),
};

describe("buildShareableBuildData", () => {
  it("returns null when no spec rows and no build DNA", () => {
    expect(
      buildShareableBuildData({
        profile: {
          ...baseProfile,
          powerPs: null,
          torqueNm: null,
          accel0To100Sec: null,
        },
        modificationsCount: 0,
        buildDna: null,
      }),
    ).toBeNull();
  });

  it("returns card data when only build DNA is present", () => {
    const data = buildShareableBuildData({
      profile: {
        ...baseProfile,
        powerPs: null,
        torqueNm: null,
        accel0To100Sec: null,
      },
      modificationsCount: 3,
      buildDna: mockBuildDna,
    });

    expect(data?.specRows).toHaveLength(0);
    expect(data?.buildDna).toEqual(mockBuildDna);
    expect(data?.modificationsCount).toBe(3);
  });

  it("maps showcase profile to spec rows and model name", () => {
    const data = buildShareableBuildData({
      profile: baseProfile,
      modificationsCount: 12,
      buildDna: mockBuildDna,
    });

    expect(data?.modelName).toContain("BMW");
    expect(data?.modelName).toContain("2018");
    expect(data?.instagramHandle).toBeNull();
    expect(data?.modificationsCount).toBe(12);
    expect(data?.buildDna).toEqual(mockBuildDna);

    const keys = data?.specRows.map((row) => row.key) ?? [];
    expect(keys).toContain("power");
    expect(keys).toContain("torque");
    expect(keys).toContain("accel0To100");

    const accel = data?.specRows.find((row) => row.key === "accel0To100");
    expect(accel?.valueText).toContain("4,2");
    expect(accel?.layout).toBe("quartett");
    expect(accel?.quartett?.polarity).toBe("lower");
  });

  it("includes build DNA from specification text without public mods", () => {
    const data = buildShareableBuildData({
      profile: {
        ...baseProfile,
        notes: "OEM+ Daily — KW V3, Milltek, 400 PS Stage 2",
      },
      modificationsCount: 0,
      buildDna: null,
      modifications: [],
      buildDnaProfile: {
        make: baseProfile.make,
        model: baseProfile.model,
        year: baseProfile.year,
        engine: null,
        powerPs: baseProfile.powerPs,
        powerKw: null,
        torqueNm: baseProfile.torqueNm,
        fuelType: null,
        transmission: null,
        drivetrain: null,
        notes: "OEM+ Daily — KW V3, Milltek, 400 PS Stage 2",
        specificationsText: "Spezifikationen: OEM+ Daily — KW V3, Milltek, 400 PS Stage 2",
        buildPersonalityLabels: [],
      },
    });

    expect(data?.buildDna).not.toBeNull();
    expect(data?.buildDna?.radar).toHaveLength(6);
  });

  it("passes instagram handle from showcase profile", () => {
    const data = buildShareableBuildData({
      profile: { ...baseProfile, instagramHandle: "julian_f11" },
      modificationsCount: 1,
      buildDna: null,
    });
    expect(data?.instagramHandle).toBe("julian_f11");
  });
});
