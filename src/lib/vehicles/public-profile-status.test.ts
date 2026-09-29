import { describe, expect, it } from "vitest";

import {
  publicProfileStatusSubtitle,
  resolveShowcaseSharePath,
} from "@/lib/vehicles/public-profile-status";

describe("publicProfileStatusSubtitle", () => {
  it("shows Build-Swipe when public without tag", () => {
    expect(
      publicProfileStatusSubtitle({
        isPublic: true,
        showcaseSwipeOptIn: true,
        hasLinkedTag: false,
      }),
    ).toBe("Im Build-Swipe");
  });

  it("shows Öffentlich when public with tag", () => {
    expect(
      publicProfileStatusSubtitle({
        isPublic: true,
        showcaseSwipeOptIn: true,
        hasLinkedTag: true,
      }),
    ).toBe("Öffentlich");
  });
});

describe("resolveShowcaseSharePath", () => {
  const pathForSlug = (slug: string) => `/v/${slug}`;

  it("returns null without active tag", () => {
    expect(
      resolveShowcaseSharePath({
        isPublic: true,
        publicSlug: "my-build",
        hasActiveTag: false,
        pathForSlug,
      }),
    ).toBeNull();
  });

  it("returns path when public with tag and slug", () => {
    expect(
      resolveShowcaseSharePath({
        isPublic: true,
        publicSlug: "my-build",
        hasActiveTag: true,
        pathForSlug,
      }),
    ).toBe("/v/my-build");
  });
});
