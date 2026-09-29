import { describe, expect, it } from "vitest";

import { pickOwnerSurfacePath } from "@/lib/vehicle-surface/owner-surface-path";

const VEHICLE_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const TAG_UUID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

describe("pickOwnerSurfacePath", () => {
  it("uses digital garage when there is no active tag", () => {
    expect(pickOwnerSurfacePath(VEHICLE_ID, null)).toBe(
      `/garage/${VEHICLE_ID}`,
    );
  });

  it("uses tag twin when a hardware tag is linked", () => {
    expect(pickOwnerSurfacePath(VEHICLE_ID, TAG_UUID)).toBe(
      `/v/${TAG_UUID}`,
    );
  });
});
