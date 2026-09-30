import { describe, expect, it } from "vitest";

import { documentsListHref } from "@/lib/vehicle-surface/documents-list-href";

const VEHICLE_ID = "11111111-1111-4111-8111-111111111111";
const TAG_UUID = "zlx-a1b2c3d4";

describe("documentsListHref", () => {
  it("uses garage route for tagless digital garage scope", () => {
    expect(
      documentsListHref(TAG_UUID, "invoice", {
        vehicleId: VEHICLE_ID,
        linkedTagUuid: null,
      }),
    ).toBe(`/garage/${VEHICLE_ID}/dokumente?type=invoice`);
  });

  it("uses tag route when scope has linked tag", () => {
    expect(
      documentsListHref(TAG_UUID, "abe", {
        vehicleId: VEHICLE_ID,
        linkedTagUuid: TAG_UUID,
      }),
    ).toBe(`/v/${TAG_UUID}/dokumente?type=abe`);
  });

  it("falls back to garage when tagUuid is a vehicle id without scope", () => {
    expect(documentsListHref(VEHICLE_ID, "invoice")).toBe(
      `/garage/${VEHICLE_ID}/dokumente?type=invoice`,
    );
  });

  it("falls back to tag route for plaque uuid without scope", () => {
    expect(documentsListHref(TAG_UUID, "invoice")).toBe(
      `/v/${TAG_UUID}/dokumente?type=invoice`,
    );
  });
});
