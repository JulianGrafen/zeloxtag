import { describe, expect, it } from "vitest";

import { buildShareCardSpecRows } from "./build-share-card-spec-rows";

const baseProfile = {
  vehicleId: "v1",
  make: "Porsche",
  model: "911",
  year: 2020,
  powerPs: 450,
  powerKw: null,
  torqueNm: 530,
  accel0To100Sec: 3.4,
  accel100To200Sec: 10.2,
  engine: "Flat-6",
  displacementCc: 2981,
  fuelType: null,
  transmission: "PDK",
  drivetrain: "AWD",
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

describe("buildShareCardSpecRows", () => {
  it("matches showcase keys and German number formatting", () => {
    const rows = buildShareCardSpecRows(baseProfile);
    const keys = rows.map((row) => row.key);

    expect(keys).toEqual(
      expect.arrayContaining([
        "power",
        "torque",
        "accel0To100",
        "accel100To200",
        "engine",
        "drivetrain",
      ]),
    );

    const accel0 = rows.find((row) => row.key === "accel0To100");
    expect(accel0?.valueText).toBe("3,4 s");
    expect(accel0?.layout).toBe("quartett");

    const accel100 = rows.find((row) => row.key === "accel100To200");
    expect(accel100?.valueText).toBe("10,2 s");
  });
});
