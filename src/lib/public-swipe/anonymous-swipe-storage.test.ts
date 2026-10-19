import { describe, expect, it } from "vitest";

import { showcaseCalendarWeekKey } from "@/lib/showcase/showcase-calendar-week";

import {
  normalizeAnonymousSwipeStorage,
  type AnonymousSwipeStorageState,
} from "./anonymous-swipe-storage";

describe("normalizeAnonymousSwipeStorage", () => {
  it("resets swipes when calendar week changes", () => {
    const state: AnonymousSwipeStorageState = {
      v: 2,
      sessionId: "sess-1",
      sessionHash: "a".repeat(64),
      calendarWeekKey: "2026-04-06",
      swipedCarIds: ["11111111-1111-1111-1111-111111111111"],
      swipeCount: 3,
    };

    const normalized = normalizeAnonymousSwipeStorage(state, "2026-04-13");
    expect(normalized.calendarWeekKey).toBe("2026-04-13");
    expect(normalized.swipedCarIds).toEqual([]);
    expect(normalized.swipeCount).toBe(0);
    expect(normalized.sessionId).toBe("sess-1");
  });

  it("keeps swipes within the same week", () => {
    const week = showcaseCalendarWeekKey(new Date("2026-04-08T10:00:00.000Z"));
    const state: AnonymousSwipeStorageState = {
      v: 2,
      sessionId: "sess-2",
      sessionHash: null,
      calendarWeekKey: week,
      swipedCarIds: ["22222222-2222-2222-2222-222222222222"],
      swipeCount: 1,
    };

    const normalized = normalizeAnonymousSwipeStorage(state, week);
    expect(normalized).toEqual(state);
  });
});
