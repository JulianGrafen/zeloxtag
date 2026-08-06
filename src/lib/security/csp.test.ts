import { describe, expect, it } from "vitest";

import { buildContentSecurityPolicy, securityHeaderEntries } from "./csp";

describe("buildContentSecurityPolicy", () => {
  it("allows blob previews and same-origin fetches", () => {
    const csp = buildContentSecurityPolicy();

    expect(csp).toMatch(/connect-src[^;]*blob:/);
    expect(csp).toMatch(/script-src[^;]*'unsafe-eval'/);
  });

  it("enables cross-origin isolation for secure embeds", () => {
    const headers = securityHeaderEntries();
    const byKey = Object.fromEntries(headers.map((h) => [h.key, h.value]));

    expect(byKey["Cross-Origin-Opener-Policy"]).toBe("same-origin");
    expect(byKey["Cross-Origin-Embedder-Policy"]).toBe("require-corp");
  });
});
