import { describe, expect, it } from "vitest";

/**
 * Pure guard logic mirrored from updateVehicleShowcaseSettings — opt-in only when public.
 */
function resolveShowcaseSwipeOptIn(input: {
  isPublic: boolean;
  previous: boolean;
  requested?: boolean;
}): boolean {
  if (!input.isPublic) return false;
  if (input.requested !== undefined) return input.requested;
  return input.previous;
}

describe("showcase swipe opt-in guards", () => {
  it("clears opt-in when showcase goes private", () => {
    expect(
      resolveShowcaseSwipeOptIn({
        isPublic: false,
        previous: true,
        requested: true,
      }),
    ).toBe(false);
  });

  it("keeps previous when public and no explicit toggle", () => {
    expect(
      resolveShowcaseSwipeOptIn({
        isPublic: true,
        previous: true,
      }),
    ).toBe(true);
  });

  it("applies explicit opt-in when public", () => {
    expect(
      resolveShowcaseSwipeOptIn({
        isPublic: true,
        previous: false,
        requested: true,
      }),
    ).toBe(true);
  });
});
