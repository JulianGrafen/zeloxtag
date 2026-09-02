import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildContentSecurityPolicy,
  generateCspNonce,
  staticSecurityHeaderEntries,
} from "./csp";

describe("buildContentSecurityPolicy", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses nonce and strict-dynamic for scripts in production", () => {
    vi.stubEnv("NODE_ENV", "production");

    const nonce = "test-nonce-value";
    const csp = buildContentSecurityPolicy({ nonce });

    expect(csp).toMatch(/script-src[^;]*'nonce-test-nonce-value'/);
    expect(csp).toMatch(/script-src[^;]*'strict-dynamic'/);
    expect(csp).not.toMatch(/script-src[^;]*'unsafe-inline'/);
    expect(csp).not.toMatch(/script-src[^;]*'unsafe-eval'/);
    expect(csp).toMatch(/style-src[^;]*'nonce-test-nonce-value'/);
    expect(csp).not.toMatch(/style-src[^;]*'unsafe-inline'/);
  });

  it("allows unsafe-eval and inline styles in development", () => {
    vi.stubEnv("NODE_ENV", "development");

    const csp = buildContentSecurityPolicy({ nonce: "dev-nonce" });

    expect(csp).toMatch(/script-src[^;]*'unsafe-eval'/);
    expect(csp).toMatch(/style-src[^;]*'unsafe-inline'/);
  });

  it("allows blob previews and same-origin fetches", () => {
    const csp = buildContentSecurityPolicy({ nonce: "x" });

    expect(csp).toMatch(/connect-src[^;]*blob:/);
    expect(csp).toMatch(/script-src[^;]*blob:/);
  });

  it("generates unique nonces", () => {
    expect(generateCspNonce()).not.toBe(generateCspNonce());
  });
});

describe("staticSecurityHeaderEntries", () => {
  it("includes baseline headers without CSP", () => {
    const headers = staticSecurityHeaderEntries();
    const byKey = Object.fromEntries(headers.map((h) => [h.key, h.value]));

    expect(byKey["X-Content-Type-Options"]).toBe("nosniff");
    expect(byKey["X-Frame-Options"]).toBe("DENY");
    expect(byKey["Content-Security-Policy"]).toBeUndefined();
  });
});
