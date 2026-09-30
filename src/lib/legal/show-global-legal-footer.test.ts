import { describe, expect, it } from "vitest";

import { shouldRenderGlobalLegalFooter } from "@/lib/legal/show-global-legal-footer";

describe("shouldRenderGlobalLegalFooter", () => {
  it("hides footer during scan deep links", () => {
    expect(
      shouldRenderGlobalLegalFooter({
        pathname: "/garage/11111111-1111-4111-8111-111111111111",
        publicShowcase: false,
        scanQueryActive: true,
        scanSurfaceActive: false,
      }),
    ).toBe(false);
  });

  it("hides footer while in-page scan UI is open", () => {
    expect(
      shouldRenderGlobalLegalFooter({
        pathname: "/v/zlx-deadbeef",
        publicShowcase: false,
        scanQueryActive: false,
        scanSurfaceActive: true,
      }),
    ).toBe(false);
  });

  it("shows footer on garage dashboard without scan", () => {
    expect(
      shouldRenderGlobalLegalFooter({
        pathname: "/garage/11111111-1111-4111-8111-111111111111",
        publicShowcase: false,
        scanQueryActive: false,
        scanSurfaceActive: false,
      }),
    ).toBe(true);
  });
});
