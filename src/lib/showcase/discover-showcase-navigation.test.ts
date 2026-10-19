import { describe, expect, it } from "vitest";

import {
  buildDiscoverShowcaseHref,
  isNavigableShowcasePublicSlug,
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

  it("accepts public swipe return path", () => {
    expect(sanitizeDiscoverBackHref("/swipe")).toBe("/swipe");
  });

  it("rejects external and non-entdecken URLs", () => {
    expect(sanitizeDiscoverBackHref("https://evil.test/entdecken")).toBeNull();
    expect(sanitizeDiscoverBackHref("/garage/abc")).toBeNull();
    expect(sanitizeDiscoverBackHref("//evil.test/entdecken")).toBeNull();
  });
});

describe("isNavigableShowcasePublicSlug", () => {
  it("rejects vehicle UUID slugs", () => {
    expect(
      isNavigableShowcasePublicSlug("a1b2c3d4-e5f6-4789-a012-3456789abcde"),
    ).toBe(false);
  });

  it("accepts public slugs", () => {
    expect(isNavigableShowcasePublicSlug("my-build")).toBe(true);
  });
});

describe("buildDiscoverShowcaseHref", () => {
  it("includes showcase and back query params", () => {
    const href = buildDiscoverShowcaseHref("my-build", "/garage/v1/entdecken");
    expect(href).toBe(
      "/v/my-build?showcase=1&back=%2Fgarage%2Fv1%2Fentdecken",
    );
  });

  it("supports public swipe return path", () => {
    const href = buildDiscoverShowcaseHref(
      "vehicle-uuid",
      "/swipe",
    );
    expect(href).toBe("/v/vehicle-uuid?showcase=1&back=%2Fswipe");
  });
});
