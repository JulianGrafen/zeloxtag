import { afterEach, describe, expect, it } from "vitest";

import { toShareCardImageFetchUrl } from "./share-card-hero-image-url";
import { resolveShareCardStoryHeroApiPath } from "./share-card-story-hero-url";

describe("toShareCardImageFetchUrl", () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
  });

  it("prefixes API paths with NEXT_PUBLIC_API_BASE_URL", () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "https://app.zeloxtag.de";
    const path = resolveShareCardStoryHeroApiPath(
      "11111111-1111-4111-8111-111111111111",
      "v1",
    );
    expect(toShareCardImageFetchUrl(path)).toBe(
      `https://app.zeloxtag.de${path}`,
    );
  });

  it("keeps data URLs unchanged", () => {
    const data = "data:image/png;base64,abc";
    expect(toShareCardImageFetchUrl(data)).toBe(data);
  });
});

describe("resolveShareCardStoryHeroApiPath", () => {
  it("includes cache bust query", () => {
    expect(
      resolveShareCardStoryHeroApiPath(
        "11111111-1111-4111-8111-111111111111",
        "2026-01-02",
      ),
    ).toBe(
      "/api/vehicle/11111111-1111-4111-8111-111111111111/story-hero?v=2026-01-02",
    );
  });
});
