import { describe, expect, it } from "vitest";

import { buildContentSecurityPolicy } from "./csp";

describe("buildContentSecurityPolicy", () => {
  it("allows IMG.LY cutout CDN fetches and WASM eval", () => {
    const csp = buildContentSecurityPolicy();

    expect(csp).toContain("https://staticimgly.com");
    expect(csp).toMatch(/script-src[^;]*'wasm-unsafe-eval'/);
    expect(csp).toMatch(/connect-src[^;]*blob:/);
  });
});
