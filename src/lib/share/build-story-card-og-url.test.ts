import { afterEach, describe, expect, it } from "vitest";

import {
  buildStoryCardOgApiPath,
  buildStoryCardOgUrl,
} from "./build-story-card-og-url";

const vehicleId = "11111111-1111-4111-8111-111111111111";

describe("buildStoryCardOgUrl", () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
  });

  it("builds relative API path", () => {
    expect(buildStoryCardOgApiPath(vehicleId)).toBe(
      `/api/og/story-card?vehicleId=${vehicleId}`,
    );
  });

  it("prefixes API base when configured", () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "https://app.zeloxtag.de";
    expect(buildStoryCardOgUrl(vehicleId)).toBe(
      `https://app.zeloxtag.de/api/og/story-card?vehicleId=${vehicleId}`,
    );
  });
});
