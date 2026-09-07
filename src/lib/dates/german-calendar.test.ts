import { describe, expect, it } from "vitest";

import {
  addMonths,
  buildMonthGrid,
  formatGermanMonthYear,
  parseIsoDateParts,
  toIsoDate,
} from "./german-calendar";

describe("german-calendar", () => {
  it("parses valid ISO dates", () => {
    expect(parseIsoDateParts("2026-03-15")).toEqual({
      year: 2026,
      monthIndex: 2,
      day: 15,
    });
    expect(parseIsoDateParts("2026-02-31")).toBeNull();
  });

  it("builds a Monday-first month grid", () => {
    const march2026 = buildMonthGrid(2026, 2);
    expect(march2026[0]?.inMonth).toBe(false);
    expect(march2026.find((cell) => cell.iso === "2026-03-01")?.day).toBe(1);
    expect(march2026.filter((cell) => cell.inMonth).length).toBe(31);
    expect(march2026.length % 7).toBe(0);
  });

  it("formats month labels and shifts months", () => {
    expect(formatGermanMonthYear(2026, 2)).toBe("März 2026");
    expect(addMonths(2026, 11, 1)).toEqual({ year: 2027, monthIndex: 0 });
    expect(toIsoDate(2026, 0, 5)).toBe("2026-01-05");
  });
});
