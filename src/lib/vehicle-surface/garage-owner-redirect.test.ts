import { describe, expect, it } from "vitest";

import { garageOwnerRedirectHref } from "./garage-owner-redirect";

describe("garageOwnerRedirectHref", () => {
  it("preserves scan deep-link query params", () => {
    expect(
      garageOwnerRedirectHref("veh-1", {
        scan: "1",
        type: "invoice",
        freeScanWelcome: "1",
      }),
    ).toBe("/garage/veh-1?scan=1&type=invoice&freeScanWelcome=1");
  });

  it("omits empty params", () => {
    expect(garageOwnerRedirectHref("veh-1", {})).toBe("/garage/veh-1");
  });
});
