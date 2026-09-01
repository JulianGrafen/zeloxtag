import { describe, expect, it } from "vitest";

import {
  resolveOwnerDynoChartViewUrl,
  resolveStoredDynoChartPath,
  vehicleDynoChartObjectPath,
} from "./dyno-chart-constants";

const VEHICLE_ID = "11111111-1111-4111-8111-111111111111";

describe("dyno chart storage paths", () => {
  it("builds `{vehicleId}/dyno-chart.ext`", () => {
    expect(vehicleDynoChartObjectPath(VEHICLE_ID, "application/pdf")).toBe(
      `${VEHICLE_ID}/dyno-chart.pdf`,
    );
  });

  it("reads a relative stored path", () => {
    expect(
      resolveStoredDynoChartPath(VEHICLE_ID, `${VEHICLE_ID}/dyno-chart.jpg`),
    ).toBe(`${VEHICLE_ID}/dyno-chart.jpg`);
  });

  it("reads a legacy public Storage URL", () => {
    expect(
      resolveStoredDynoChartPath(
        VEHICLE_ID,
        `https://example.supabase.co/storage/v1/object/public/vehicle-documents/${VEHICLE_ID}/dyno-chart.pdf?v=9`,
      ),
    ).toBe(`${VEHICLE_ID}/dyno-chart.pdf`);
  });

  it("maps stored paths to the owner proxy", () => {
    expect(
      resolveOwnerDynoChartViewUrl(VEHICLE_ID, `${VEHICLE_ID}/dyno-chart.pdf`),
    ).toMatch(new RegExp(`^/api/vehicle/dyno-chart/${VEHICLE_ID}\\?v=`));
  });
});
