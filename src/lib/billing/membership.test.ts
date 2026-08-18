import { describe, expect, it } from "vitest";

import { isActiveMembership } from "@/lib/billing/membership";

describe("isActiveMembership", () => {
  it("requires active status and a future period end", () => {
    const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    expect(isActiveMembership("active", future)).toBe(true);
  });

  it("does not grant Pro when period end is missing", () => {
    expect(isActiveMembership("active", null)).toBe(false);
  });

  it("does not grant Pro when period end is unparseable", () => {
    expect(isActiveMembership("active", "not-a-date")).toBe(false);
  });

  it("does not grant Pro when the period has expired", () => {
    const past = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    expect(isActiveMembership("active", past)).toBe(false);
  });

  it("allows a short grace window after period end", () => {
    const recentPast = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
    expect(isActiveMembership("active", recentPast)).toBe(true);
  });

  it("rejects non-active statuses even with a future period end", () => {
    const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    expect(isActiveMembership("pending", future)).toBe(false);
    expect(isActiveMembership("past_due", future)).toBe(false);
    expect(isActiveMembership("canceled", future)).toBe(false);
  });
});
