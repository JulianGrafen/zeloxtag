import { describe, expect, it } from "vitest";

import {
  resolveOwnerDynoChartViewUrl,
  resolvePublicDynoChartHref,
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

  it("maps owner dyno proxy URLs to the public showcase route", () => {
    expect(
      resolvePublicDynoChartHref(
        VEHICLE_ID,
        `/api/vehicle/dyno-chart/${VEHICLE_ID}?v=123`,
      ),
    ).toEqual({
      href: `/api/public/vehicle/${VEHICLE_ID}/dyno-chart`,
      isImage: false,
    });
  });

  it("maps legacy file-proxy dyno URLs to the public showcase route", () => {
    expect(
      resolvePublicDynoChartHref(
        VEHICLE_ID,
        `/api/public/vehicle/${VEHICLE_ID}/file?src=https%3A%2F%2Fexample.supabase.co%2Fdyno-chart.jpg`,
      ),
    ).toEqual({
      href: `/api/public/vehicle/${VEHICLE_ID}/dyno-chart`,
      isImage: true,
    });
  });

  it("keeps demo dyno assets on /demo", () => {
    expect(resolvePublicDynoChartHref(VEHICLE_ID, "/demo/dyno-e36.svg")).toEqual({
      href: "/demo/dyno-e36.svg",
      isImage: true,
    });
  });
});
