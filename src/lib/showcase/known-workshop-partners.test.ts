import { describe, expect, it } from "vitest";

import {
  AUTOHAUS_KEMPER_B2B_PARTNER,
  resolveKnownWorkshopPartner,
} from "./known-workshop-partners";

describe("resolveKnownWorkshopPartner", () => {
  it("detects Autohaus Kemper from a scanned invoice vendor", () => {
    expect(
      resolveKnownWorkshopPartner([
        { vendor: "Bosch Car Service", manufacturer: null },
        { vendor: "Autohaus Kemper GmbH", manufacturer: null },
      ]),
    ).toEqual(AUTOHAUS_KEMPER_B2B_PARTNER);
  });

  it("detects Kemper from a manual Umbau manufacturer / Unique Projects", () => {
    expect(
      resolveKnownWorkshopPartner([
        { vendor: null, manufacturer: "Unique Projects" },
      ])?.name,
    ).toBe("Autohaus Kemper");
    expect(
      resolveKnownWorkshopPartner([{ vendor: null, manufacturer: "KEMPER" }])
        ?.kicker,
    ).toBe("Built by");
  });

  it("returns null without a known partner", () => {
    expect(
      resolveKnownWorkshopPartner([
        { vendor: "Kemperling Tuning", manufacturer: "H&R" },
        { vendor: null, manufacturer: null },
      ]),
    ).toBeNull();
  });
});
