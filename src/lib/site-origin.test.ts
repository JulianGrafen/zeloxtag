import { describe, expect, it, afterEach } from "vitest";

import { resolvePublicSiteOrigin, resolveAuthSiteOrigin } from "@/lib/site-origin";

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

  it("forces auth flows onto the canonical domain outside localhost", () => {
    expect(
      resolveAuthSiteOrigin({
        nextUrl: new URL("https://zeloxtag.vercel.app/auth/login/google"),
      }),
    ).toBe("https://app.zeloxtag.de");
    expect(
      resolveAuthSiteOrigin({
        nextUrl: new URL("https://app.zeloxtag.de/auth/callback"),
      }),
    ).toBe("https://app.zeloxtag.de");
  });

  it("keeps localhost for local auth development", () => {
    expect(
      resolveAuthSiteOrigin({
        nextUrl: new URL("http://localhost:3000/auth/login/google"),
      }),
    ).toBe("http://localhost:3000");
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
