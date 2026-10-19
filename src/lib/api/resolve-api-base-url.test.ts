import { afterEach, describe, expect, it } from "vitest";

import {
  resolveApiBaseUrl,
  resolveApiUrl,
  resolvePublicAppOrigin,
} from "./resolve-api-base-url";

describe("resolveApiBaseUrl", () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
    delete process.env.NEXT_PUBLIC_SITE_URL;
  });

  it("returns empty string when unset (same-origin web)", () => {
    expect(resolveApiBaseUrl()).toBe("");
    expect(resolveApiUrl("/api/og/story-card")).toBe("/api/og/story-card");
  });

  it("strips trailing slash from API base", () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "https://app.zeloxtag.de/";
    expect(resolveApiBaseUrl()).toBe("https://app.zeloxtag.de");
    expect(resolveApiUrl("/api/health")).toBe("https://app.zeloxtag.de/api/health");
  });

  it("uses NEXT_PUBLIC_SITE_URL origin for public app links", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://app.zeloxtag.de/garage";
    expect(resolvePublicAppOrigin()).toBe("https://app.zeloxtag.de");
  });
});
