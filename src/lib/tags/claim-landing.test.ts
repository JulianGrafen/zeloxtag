import { describe, expect, it } from "vitest";

import type { TagScanResult } from "@/types/database";

import {
  CLAIM_UNAVAILABLE_MESSAGE,
  isClaimLandingIdentifier,
  publicScanLookupKind,
} from "./claim-landing";
import { MOCK_TAG_UUIDS } from "./mock-tags";

const PLAQUE_UUID = "75c69a24-753f-4c1e-9798-7063ff40b73f";

const unclaimedResult = {
  tag: {
    id: "tag_1",
    uuid: PLAQUE_UUID,
    vehicle_id: null,
    status: "unclaimed",
    created_at: "",
    updated_at: "",
  },
  vehicle: null,
  documents: [],
} as TagScanResult;

const activeResult = {
  ...unclaimedResult,
  tag: {
    ...unclaimedResult.tag,
    status: "active",
    vehicle_id: "veh_1",
  },
  vehicle: { id: "veh_1", make: "Toyota", model: "Supra" },
} as TagScanResult;

describe("claim landing oracle", () => {
  it("treats plaque UUIDs and the demo unclaimed slug as claim landings", () => {
    expect(isClaimLandingIdentifier(PLAQUE_UUID)).toBe(true);
    expect(isClaimLandingIdentifier(` ${PLAQUE_UUID} `)).toBe(true);
    expect(isClaimLandingIdentifier(MOCK_TAG_UUIDS.unclaimed)).toBe(true);
    expect(isClaimLandingIdentifier("not-a-tag")).toBe(false);
    expect(isClaimLandingIdentifier(MOCK_TAG_UUIDS.active)).toBe(false);
  });

  it("hides unclaimed and missing plaque UUIDs from the public resolver", () => {
    expect(publicScanLookupKind(PLAQUE_UUID, unclaimedResult)).toBe("absent");
    expect(publicScanLookupKind(PLAQUE_UUID, null)).toBe("absent");
    expect(publicScanLookupKind(PLAQUE_UUID, activeResult)).toBe("tag");
  });

  it("only tries share slugs for non-UUID identifiers that are not known tags", () => {
    expect(publicScanLookupKind("my-supra", null)).toBe("try-slug");
    expect(publicScanLookupKind(MOCK_TAG_UUIDS.unclaimed, unclaimedResult)).toBe(
      "absent",
    );
  });

  it("keeps a single claim-failure copy", () => {
    expect(CLAIM_UNAVAILABLE_MESSAGE.length).toBeGreaterThan(10);
  });
});
