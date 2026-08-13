import { describe, expect, it } from "vitest";

import {
  isDemoOrShowcasePath,
  isGenericPostLoginNext,
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
