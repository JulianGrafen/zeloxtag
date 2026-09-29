import { describe, expect, it } from "vitest";

import { canViewPublicShowcaseSlug } from "@/lib/vehicle-surface/public-showcase-eligibility";

describe("canViewPublicShowcaseSlug", () => {
  it("allows public vehicles without hardware tag", () => {
    expect(canViewPublicShowcaseSlug({ is_public: true })).toBe(true);
  });

  it("blocks private vehicles", () => {
    expect(canViewPublicShowcaseSlug({ is_public: false })).toBe(false);
  });
});
