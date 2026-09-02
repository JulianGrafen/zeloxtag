import { describe, expect, it } from "vitest";

import { FEATURE, isProOnlyFeature } from "@/lib/permissions/feature-access";

describe("ProFeatureGate policy", () => {
  it("never gates free-tier vault read or manual entry features", () => {
    expect(isProOnlyFeature(FEATURE.VIEW_DOCUMENT_VAULT)).toBe(false);
    expect(isProOnlyFeature(FEATURE.ADD_MANUAL_SERVICE_ENTRY)).toBe(false);
    expect(isProOnlyFeature(FEATURE.EDIT_BASIC_PROFILE)).toBe(false);
  });

  it("still gates vault writes and AI scan on Pro", () => {
    expect(isProOnlyFeature(FEATURE.DOCUMENT_VAULT)).toBe(true);
    expect(isProOnlyFeature(FEATURE.SCAN_AI_RECEIPT)).toBe(true);
  });
});
