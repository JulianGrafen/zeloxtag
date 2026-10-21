import { describe, expect, it } from "vitest";

import { buildDemoPublicShowcasePayload } from "@/lib/demo/demo-public-showcase-payload";
import { getMockTagScan, MOCK_TAG_UUIDS } from "@/lib/tags/mock-tags";

describe("demo build story", () => {
  it("includes public story slice on demo showcase payload", () => {
    const scan = getMockTagScan(MOCK_TAG_UUIDS.active);
    expect(scan?.vehicle).toBeDefined();
    if (!scan?.vehicle) {
      throw new Error("expected demo vehicle on active mock tag");
    }

    const payload = buildDemoPublicShowcasePayload(
      scan.vehicle,
      scan.documents,
    );

    expect(payload.profile.isStoryPublic).toBe(true);
    expect(payload.profile.publicSlug).toBeTruthy();
    expect(payload.buildStory?.entries.length).toBeGreaterThan(0);
    expect(payload.buildStory?.entries[0]?.imageSrc).toMatch(
      /^(\/demo\/|\/api\/)/,
    );
    expect(payload.profile.dynoChartUrl).toBe("/demo/dyno-e36.svg");
    expect(payload.profile.dynoChartIsImage).toBe(true);
    expect(payload.photos.some((p) => p.id === "demo-dyno")).toBe(true);
  });
});
