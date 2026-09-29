import { describe, expect, it } from "vitest";

import { parseTagUuidFromScanPayload } from "@/lib/tags/parse-tag-scan-payload";

const TAG = "a1b2c3d4-e5f6-4789-a012-3456789abcde";

describe("parseTagUuidFromScanPayload", () => {
  it("accepts raw UUID", () => {
    expect(parseTagUuidFromScanPayload(TAG)).toBe(TAG);
  });

  it("parses full scan URL", () => {
    expect(
      parseTagUuidFromScanPayload(`https://app.zeloxtag.de/v/${TAG}?scan=1`),
    ).toBe(TAG);
  });

  it("parses path-only payload", () => {
    expect(parseTagUuidFromScanPayload(`/v/${TAG}`)).toBe(TAG);
  });

  it("rejects garbage", () => {
    expect(parseTagUuidFromScanPayload("not-a-tag")).toBeNull();
  });
});
