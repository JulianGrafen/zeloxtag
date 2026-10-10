import { describe, expect, it } from "vitest";

import {
  buildDiscoverShowcaseHref,
  sanitizeDiscoverBackHref,
} from "./discover-showcase-navigation";

describe("sanitizeDiscoverBackHref", () => {
  it("accepts garage entdecken paths", () => {
    expect(sanitizeDiscoverBackHref("/garage/abc/entdecken")).toBe(
      "/garage/abc/entdecken",
    );
  });

  it("accepts encoded paths", () => {
    expect(
      sanitizeDiscoverBackHref(
        encodeURIComponent("/v/zlx-tag/entdecken"),
      ),
    ).toBe("/v/zlx-tag/entdecken");
  });

  it("rejects external and non-entdecken URLs", () => {
    expect(sanitizeDiscoverBackHref("https://evil.test/entdecken")).toBeNull();
    expect(sanitizeDiscoverBackHref("/garage/abc")).toBeNull();
    expect(sanitizeDiscoverBackHref("//evil.test/entdecken")).toBeNull();
  });
});

describe("buildDiscoverShowcaseHref", () => {
  it("includes showcase and back query params", () => {
    const href = buildDiscoverShowcaseHref("my-build", "/garage/v1/entdecken");
    expect(href).toBe(
      "/v/my-build?showcase=1&back=%2Fgarage%2Fv1%2Fentdecken",
    );
  });
});
