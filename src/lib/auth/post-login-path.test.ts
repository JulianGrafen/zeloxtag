import { describe, expect, it } from "vitest";

import {
  isDemoOrShowcasePath,
  isGenericPostLoginNext,
  normalizeAuthCallbackNext,
  sanitizePostLoginPath,
} from "@/lib/auth/post-login-path";
import { MOCK_TAG_UUIDS } from "@/lib/tags/mock-tags";

describe("isDemoOrShowcasePath", () => {
  it("treats /demo as a showcase route", () => {
    expect(isDemoOrShowcasePath("/demo")).toBe(true);
  });

  it("treats mock tag routes as showcase routes", () => {
    expect(isDemoOrShowcasePath(`/v/${MOCK_TAG_UUIDS.active}`)).toBe(true);
    expect(isDemoOrShowcasePath(`/v/${MOCK_TAG_UUIDS.unclaimed}?scan=1`)).toBe(
      true,
    );
  });

  it("treats legacy mock list routes as showcase routes", () => {
    expect(isDemoOrShowcasePath("/rechnungen")).toBe(true);
    expect(isDemoOrShowcasePath("/abe/123")).toBe(true);
    expect(isDemoOrShowcasePath("/intervalle")).toBe(true);
  });

  it("allows real vehicle deep links", () => {
    expect(
      isDemoOrShowcasePath(
        "/v/8f3a9b2c-1a2b-4c3d-8e9f-0a1b2c3d4e5f",
      ),
    ).toBe(false);
  });
});

describe("isGenericPostLoginNext", () => {
  it("includes demo routes so signup never lands on showcase", () => {
    expect(isGenericPostLoginNext("/demo")).toBe(true);
    expect(isGenericPostLoginNext(`/v/${MOCK_TAG_UUIDS.active}`)).toBe(true);
  });

  it("keeps real claim deep links explicit", () => {
    expect(
      isGenericPostLoginNext(
        "/v/8f3a9b2c-1a2b-4c3d-8e9f-0a1b2c3d4e5f",
      ),
    ).toBe(false);
  });
});

describe("sanitizePostLoginPath", () => {
  it("rewrites showcase routes to /dashboard", () => {
    expect(sanitizePostLoginPath("/demo")).toBe("/dashboard");
    expect(sanitizePostLoginPath(`/v/${MOCK_TAG_UUIDS.active}`)).toBe(
      "/dashboard",
    );
  });

  it("keeps real vehicle dashboards", () => {
    expect(
      sanitizePostLoginPath("/v/8f3a9b2c-1a2b-4c3d-8e9f-0a1b2c3d4e5f"),
    ).toBe("/v/8f3a9b2c-1a2b-4c3d-8e9f-0a1b2c3d4e5f");
  });
});

describe("normalizeAuthCallbackNext", () => {
  it("routes demo next params through /auth/continue", () => {
    expect(normalizeAuthCallbackNext("/demo")).toBe("/auth/continue");
    expect(normalizeAuthCallbackNext("/rechnungen")).toBe("/auth/continue");
  });
});
