import { describe, expect, it } from "vitest";

import { buildContentSecurityPolicy, securityHeaderEntries } from "./csp";

describe("buildContentSecurityPolicy", () => {
  it("keeps a strict script policy without eval", () => {
    const csp = buildContentSecurityPolicy();

    expect(csp).toMatch(/script-src 'self' 'unsafe-inline'/);
    expect(csp).not.toContain("unsafe-eval");
    expect(csp).toMatch(/connect-src[^;]*blob:/);
  });

  it("does not force COEP (no longer required for cutouts)", () => {
    const headers = securityHeaderEntries();
    const byKey = Object.fromEntries(headers.map((h) => [h.key, h.value]));

    expect(byKey["Cross-Origin-Opener-Policy"]).toBe("same-origin");
    expect(byKey["Cross-Origin-Embedder-Policy"]).toBeUndefined();
  });
});
