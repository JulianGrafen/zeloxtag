import { describe, expect, it } from "vitest";

import { isMissingVehicleBuildDnaColumnError } from "./load-vehicle-projection";

describe("isMissingVehicleBuildDnaColumnError", () => {
  it("detects missing showcase_build_dna column errors", () => {
    expect(
      isMissingVehicleBuildDnaColumnError({
        message: 'column vehicles.showcase_build_dna does not exist',
      }),
    ).toBe(true);
  });

  it("ignores unrelated errors", () => {
    expect(
      isMissingVehicleBuildDnaColumnError({
        message: "permission denied for table vehicles",
      }),
    ).toBe(false);
  });
});
