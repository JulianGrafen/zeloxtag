import { describe, expect, it } from "vitest";

import { formatShowroomModBadgeDate } from "@/components/public-showcase/ShowroomMods";

describe("formatShowroomModBadgeDate", () => {
  it("formats ISO dates as MM/YY", () => {
    expect(formatShowroomModBadgeDate("2026-03-15")).toBe("03/26");
    expect(formatShowroomModBadgeDate("2025-09-01")).toBe("09/25");
  });

  it("returns null for invalid input", () => {
    expect(formatShowroomModBadgeDate(null)).toBeNull();
    expect(formatShowroomModBadgeDate("invalid")).toBeNull();
  });
});
