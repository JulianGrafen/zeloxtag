import { afterEach, describe, expect, it, vi } from "vitest";

import { promoteShareCardHeroToDataUrl } from "./promote-share-card-hero-to-data-url";

describe("promoteShareCardHeroToDataUrl", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns data URLs unchanged", async () => {
    const data = "data:image/png;base64,abc";
    await expect(promoteShareCardHeroToDataUrl(data)).resolves.toBe(data);
  });

  it("fetches remote URLs with credentials", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      blob: async () => new Blob(["x"], { type: "image/jpeg" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await promoteShareCardHeroToDataUrl(
      "https://app.example/api/vehicle/x/story-hero?v=1",
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "https://app.example/api/vehicle/x/story-hero?v=1",
      { credentials: "include", cache: "force-cache" },
    );
  });
});
