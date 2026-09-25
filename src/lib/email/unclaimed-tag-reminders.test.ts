import { describe, expect, it } from "vitest";

import { isDueUnclaimedTagReminderDay } from "./unclaimed-tag-reminders";

describe("isDueUnclaimedTagReminderDay", () => {
  it("matches only the target UTC day bucket", () => {
    expect(isDueUnclaimedTagReminderDay(2, 3)).toBe(false);
    expect(isDueUnclaimedTagReminderDay(3, 3)).toBe(true);
    expect(isDueUnclaimedTagReminderDay(3.9, 3)).toBe(true);
    expect(isDueUnclaimedTagReminderDay(4, 3)).toBe(false);
  });

  it("supports day-7 follow-up", () => {
    expect(isDueUnclaimedTagReminderDay(6, 7)).toBe(false);
    expect(isDueUnclaimedTagReminderDay(7, 7)).toBe(true);
    expect(isDueUnclaimedTagReminderDay(8, 7)).toBe(false);
  });
});
