import { describe, expect, it } from "vitest";

import {
  dynoChartContentTypeFromPath,
  dynoChartExtensionForMime,
  isVehicleDynoChartStoragePath,
  vehicleDynoChartCandidatePaths,
  vehicleDynoChartObjectPath,
} from "@/lib/vehicles/dyno-chart-constants";

const vehicleId = "11111111-1111-4111-8111-111111111111";

describe("dyno chart storage paths", () => {
  it("uses pdf by default and jpg for jpeg uploads", () => {
    expect(vehicleDynoChartObjectPath(vehicleId)).toBe(
      `${vehicleId}/dyno-chart.pdf`,
    );
    expect(vehicleDynoChartObjectPath(vehicleId, "image/jpeg")).toBe(
      `${vehicleId}/dyno-chart.jpg`,
    );
    expect(dynoChartExtensionForMime("image/png")).toBe("png");
  });

  it("recognizes image and pdf object names", () => {
    expect(isVehicleDynoChartStoragePath(`${vehicleId}/dyno-chart.pdf`)).toBe(
      true,
    );
    expect(isVehicleDynoChartStoragePath(`${vehicleId}/dyno-chart.jpg`)).toBe(
      true,
    );
    expect(isVehicleDynoChartStoragePath(`${vehicleId}/invoice.pdf`)).toBe(
      false,
    );
  });

  it("maps path extensions to content types", () => {
    expect(dynoChartContentTypeFromPath(`${vehicleId}/dyno-chart.webp`)).toBe(
      "image/webp",
    );
    expect(dynoChartContentTypeFromPath(`${vehicleId}/dyno-chart.pdf`)).toBe(
      "application/pdf",
    );
  });

  it("lists replaceable candidate paths", () => {
    const paths = vehicleDynoChartCandidatePaths(vehicleId);
    expect(paths).toContain(`${vehicleId}/dyno-chart.pdf`);
    expect(paths).toContain(`${vehicleId}/dyno-chart.jpg`);
  });
});
