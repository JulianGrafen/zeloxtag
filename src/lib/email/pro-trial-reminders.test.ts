import { describe, expect, it } from "vitest";

import { wholeDaysSince } from "./pro-trial-reminders";

describe("wholeDaysSince", () => {
  it("returns 0 on the start day", () => {
    const start = "2026-01-01T12:00:00.000Z";
    const now = Date.parse("2026-01-01T20:00:00.000Z");
    expect(wholeDaysSince(start, now)).toBe(0);
  });

  it("returns 7 after seven full UTC day buckets", () => {
    const start = "2026-01-01T00:00:00.000Z";
    const now = Date.parse("2026-01-08T10:00:00.000Z");
    expect(wholeDaysSince(start, now)).toBe(7);
  });

  it("returns -1 for invalid timestamps", () => {
    expect(wholeDaysSince("not-a-date")).toBe(-1);
  });
});
