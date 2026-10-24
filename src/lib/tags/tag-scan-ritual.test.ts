import { describe, expect, it } from "vitest";

import {
  buildTagScanRitualTicker,
  isTagScanRitualSuppressedBySearch,
} from "./tag-scan-ritual";

describe("isTagScanRitualSuppressedBySearch", () => {
  it("suppresses entdecken showcase deep links", () => {
    expect(isTagScanRitualSuppressedBySearch({ showcase: "1" })).toBe(true);
  });

  it("allows plain QR landing", () => {
    expect(isTagScanRitualSuppressedBySearch({})).toBe(false);
  });

  it("suppresses post-checkout return", () => {
    expect(
      isTagScanRitualSuppressedBySearch({ session_id: "cs_test_123" }),
    ).toBe(true);
  });
});

describe("buildTagScanRitualTicker", () => {
  it("includes V4A verified copy and display id", () => {
    expect(buildTagScanRitualTicker("0421")).toContain("V4A TAG VERIFIED");
    expect(buildTagScanRitualTicker("0421")).toContain("#0421");
  });
});
