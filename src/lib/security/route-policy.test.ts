import { describe, expect, it } from "vitest";

import { isPublicPath } from "./route-policy";

describe("isPublicPath", () => {
  it("allows token-gated exposé URLs and keeps owner APIs protected", () => {
    expect(
      isPublicPath("/expose/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"),
    ).toBe(true);
    expect(isPublicPath("/v/demo-active-tag")).toBe(true);
    expect(isPublicPath("/dashboard")).toBe(false);
  });
});
