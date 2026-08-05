import { describe, expect, it } from "vitest";

import { buildContentSecurityPolicy } from "./csp";

describe("buildContentSecurityPolicy", () => {
  it("allows IMG.LY cutout CDN fetches and WASM eval", () => {
    const csp = buildContentSecurityPolicy();

    expect(csp).toContain("https://staticimgly.com");
    expect(csp).toMatch(/script-src[^;]*'unsafe-eval'/);
    expect(csp).toMatch(/script-src[^;]*'wasm-unsafe-eval'/);
    expect(csp).toMatch(/connect-src[^;]*blob:/);
  });

  it("enables cross-origin isolation for SharedArrayBuffer cutout", async () => {
    const { securityHeaderEntries } = await import("./csp");
    const headers = securityHeaderEntries();
    const byKey = Object.fromEntries(headers.map((h) => [h.key, h.value]));

    expect(byKey["Cross-Origin-Opener-Policy"]).toBe("same-origin");
    expect(byKey["Cross-Origin-Embedder-Policy"]).toBe("credentialless");
  });
});
