import { describe, expect, it } from "vitest";

import {
  ACCOUNT_DELETION_GRACE_DAYS,
  daysUntilGraceEnd,
  formatGraceEndDateGerman,
  isGracePeriodExpired,
} from "@/lib/account/account-deletion-shared";

describe("account deletion shared", () => {
  it("defines a 30-day grace window", () => {
    expect(ACCOUNT_DELETION_GRACE_DAYS).toBe(30);
  });

  it("computes remaining days until grace end", () => {
    const ends = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
    expect(daysUntilGraceEnd(ends)).toBe(5);
  });

  it("never returns negative remaining days", () => {
    const past = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    expect(daysUntilGraceEnd(past)).toBe(0);
  });

  it("detects expired grace periods for purge selection", () => {
    const past = new Date("2020-01-01T00:00:00.000Z").toISOString();
    const future = new Date("2099-01-01T00:00:00.000Z").toISOString();
    const now = Date.parse("2025-06-01T00:00:00.000Z");

    expect(isGracePeriodExpired(past, now)).toBe(true);
    expect(isGracePeriodExpired(future, now)).toBe(false);
  });

  it("formats grace end dates in German locale", () => {
    const formatted = formatGraceEndDateGerman("2026-12-24T12:00:00.000Z");
    expect(formatted).toMatch(/2026/);
    expect(formatted.length).toBeGreaterThan(4);
  });
});
