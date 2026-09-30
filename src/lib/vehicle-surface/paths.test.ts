import { describe, expect, it } from "vitest";

import { paywallDashboardHref } from "./paywall-dashboard-href";
import {
  garagePathForVehicle,
  vehicleSurfaceBasePath,
  vehicleSurfaceHref,
} from "./paths";

describe("vehicleSurface paths", () => {
  it("uses tag route when linked", () => {
    const scope = {
      vehicleId: "11111111-1111-4111-8111-111111111111",
      linkedTagUuid: "22222222-2222-4222-8222-222222222222",
    };
    expect(vehicleSurfaceBasePath(scope)).toBe(
      "/v/22222222-2222-4222-8222-222222222222",
    );
    expect(vehicleSurfaceHref(scope, "tanken")).toBe(
      "/v/22222222-2222-4222-8222-222222222222/tanken",
    );
  });

  it("uses garage route without tag", () => {
    const scope = {
      vehicleId: "11111111-1111-4111-8111-111111111111",
      linkedTagUuid: null,
    };
    expect(vehicleSurfaceBasePath(scope)).toBe(
      "/garage/11111111-1111-4111-8111-111111111111",
    );
    expect(garagePathForVehicle(scope.vehicleId, "dokumente")).toBe(
      "/garage/11111111-1111-4111-8111-111111111111/dokumente",
    );
    expect(vehicleSurfaceHref(scope, "?scan=1&type=invoice")).toBe(
      "/garage/11111111-1111-4111-8111-111111111111?scan=1&type=invoice",
    );
  });
});

describe("paywallDashboardHref", () => {
  const vehicleId = "11111111-1111-4111-8111-111111111111";

  it("uses garage dashboard for tagless scope", () => {
    expect(
      paywallDashboardHref(vehicleId, {
        vehicleId,
        linkedTagUuid: null,
      }),
    ).toBe(`/garage/${vehicleId}`);
  });

  it("uses tag dashboard when tag uuid is passed without scope", () => {
    expect(paywallDashboardHref("zlx-deadbeef")).toBe("/v/zlx-deadbeef");
  });
});
