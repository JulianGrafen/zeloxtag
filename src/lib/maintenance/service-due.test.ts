import { describe, expect, it } from "vitest";

import { mergeServiceDueDates } from "./service-due";

describe("mergeServiceDueDates", () => {
  it("uses calendar when velocity is missing", () => {
    const result = mergeServiceDueDates({
      lastServiceIsoDate: "2024-01-15",
      intervalMonths: 12,
      lastMileageKm: 50_000,
      nextDueKm: 60_000,
      latestKnownMileageKm: 52_000,
      kmPerDay: null,
    });
    expect(result.kmBasedEstimate).toBe(false);
    expect(result.nextDueDateIso).toBe("2025-01-15");
  });

  it("picks earlier km-based date when driving a lot", () => {
    const result = mergeServiceDueDates({
      lastServiceIsoDate: "2024-01-01",
      intervalMonths: 12,
      lastMileageKm: 10_000,
      nextDueKm: 20_000,
      latestKnownMileageKm: 15_000,
      kmPerDay: 200,
    });
    expect(result.kmBasedEstimate).toBe(true);
    expect(result.nextDueDateIso).toBe("2024-02-20");
  });
});
