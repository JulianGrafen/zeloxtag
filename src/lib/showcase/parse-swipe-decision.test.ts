import { describe, expect, it } from "vitest";

import { parseShowcaseSwipeDecision } from "@/lib/showcase/parse-swipe-decision";

describe("parseShowcaseSwipeDecision", () => {
  it("accepts like and pass", () => {
    expect(parseShowcaseSwipeDecision("like")).toBe("like");
    expect(parseShowcaseSwipeDecision("pass")).toBe("pass");
  });

  it("rejects invalid values", () => {
    expect(parseShowcaseSwipeDecision("superlike")).toBeNull();
    expect(parseShowcaseSwipeDecision(null)).toBeNull();
    expect(parseShowcaseSwipeDecision(1)).toBeNull();
  });
});
