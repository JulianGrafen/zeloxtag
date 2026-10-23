import { describe, expect, it } from "vitest";

import { parseStoryCardHeroAbsoluteUrl } from "./parse-story-card-hero-url";

const vehicleId = "11111111-1111-4111-8111-111111111111";

describe("parseStoryCardHeroAbsoluteUrl", () => {
  it("detects silhouette proxy paths", () => {
    expect(
      parseStoryCardHeroAbsoluteUrl(
        `https://app.zeloxtag.de/api/vehicle/silhouette/${vehicleId}?v=1&w=960`,
      ),
    ).toEqual({ kind: "silhouette", vehicleId });
  });

  it("detects public showcase file proxy paths", () => {
    const src = `${vehicleId}/doc-id/photo.jpg`;
    expect(
      parseStoryCardHeroAbsoluteUrl(
        `https://app.zeloxtag.de/api/public/vehicle/${vehicleId}/file?src=${encodeURIComponent(src)}&w=800`,
      ),
    ).toEqual({ kind: "publicFile", vehicleId, src });
  });

  it("falls back to remote fetch for catalog assets", () => {
    const url = "https://app.zeloxtag.de/api/vehicle/catalog/bmw-m3.png";
    expect(parseStoryCardHeroAbsoluteUrl(url)).toEqual({
      kind: "remote",
      url,
    });
  });
});
