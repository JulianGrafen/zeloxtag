import { describe, expect, it } from "vitest";

import {
  previousShowcaseCalendarWeekKey,
  showcaseCalendarWeekKey,
} from "@/lib/showcase/showcase-calendar-week";

describe("showcaseCalendarWeekKey", () => {
  it("returns Monday YMD for a mid-week Berlin date", () => {
    expect(
      showcaseCalendarWeekKey(new Date("2026-04-08T10:00:00.000Z")),
    ).toBe("2026-04-06");
  });
});

describe("previousShowcaseCalendarWeekKey", () => {
  it("returns the prior Monday bucket", () => {
    expect(
      previousShowcaseCalendarWeekKey(new Date("2026-04-08T10:00:00.000Z")),
    ).toBe("2026-03-30");
  });
});
