import { describe, expect, it } from "vitest";

import { garageSwitchPath } from "./garage-switch-path";

describe("garageSwitchPath", () => {
  it("preserves sub-path and query when switching vehicles", () => {
    expect(
      garageSwitchPath(
        "/garage/old-vehicle/dokumente",
        "?type=abe",
        { vehicleId: "old-vehicle", linkedTagUuid: null },
        {
          vehicleId: "new-vehicle",
          tagUuid: null,
          make: "VW",
          model: "Golf",
          year: 2020,
          label: "VW Golf",
          imageAlt: "VW Golf",
        },
      ),
    ).toBe("/garage/new-vehicle/dokumente?type=abe");
  });

  it("switches to tag route when next vehicle has a linked tag", () => {
    expect(
      garageSwitchPath(
        "/garage/old-vehicle/dokumente",
        "",
        { vehicleId: "old-vehicle", linkedTagUuid: null },
        {
          vehicleId: "new-vehicle",
          tagUuid: "22222222-2222-4222-8222-222222222222",
          make: "BMW",
          model: "M2",
          year: 2020,
          label: "BMW M2",
          imageAlt: "BMW M2",
        },
      ),
    ).toBe("/v/22222222-2222-4222-8222-222222222222/dokumente");
  });
});
