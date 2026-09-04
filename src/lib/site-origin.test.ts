import { describe, expect, it, afterEach } from "vitest";

import { resolvePublicSiteOrigin } from "@/lib/site-origin";

describe("resolvePublicSiteOrigin", () => {
  const env = process.env;

  afterEach(() => {
    process.env = env;
  });

  it("uses production domain in production even when SITE_URL is localhost", () => {
    process.env = {
      ...env,
      NODE_ENV: "production",
      VERCEL_ENV: "production",
      NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
    };
    expect(resolvePublicSiteOrigin()).toBe("https://app.zeloxtag.de");
  });

  it("respects a valid production SITE_URL", () => {
    process.env = {
      ...env,
      NODE_ENV: "production",
      VERCEL_ENV: "production",
      NEXT_PUBLIC_SITE_URL: "https://app.zeloxtag.de",
    };
    expect(resolvePublicSiteOrigin()).toBe("https://app.zeloxtag.de");
  });

  it("ignores vercel.app SITE_URL in production", () => {
    process.env = {
      ...env,
      NODE_ENV: "production",
      VERCEL_ENV: "production",
      NEXT_PUBLIC_SITE_URL: "https://zeloxtag.vercel.app",
    };
    expect(resolvePublicSiteOrigin()).toBe("https://app.zeloxtag.de");
  });

  it("defaults to localhost in development", () => {
    process.env = {
      ...env,
      NODE_ENV: "development",
      VERCEL_ENV: "development",
      NEXT_PUBLIC_SITE_URL: "",
    };
    expect(resolvePublicSiteOrigin()).toBe("http://localhost:3000");
  });
});
