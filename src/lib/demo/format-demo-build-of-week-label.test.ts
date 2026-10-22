import { describe, expect, it } from "vitest";

import { formatDemoBuildOfWeekLabel } from "@/lib/demo/format-demo-build-of-week-label";

describe("formatDemoBuildOfWeekLabel", () => {
  it("formats make and model", () => {
    expect(
      formatDemoBuildOfWeekLabel({
        rank: 1,
        vehicleId: "id",
        publicSlug: "slug",
        make: "BMW",
        model: "M2",
        year: 2023,
        weeklyLikes: 5,
        heroImageSrc: null,
        heroImageUsesCover: true,
      }),
    ).toBe("Build der Woche · BMW M2");
  });

  it("returns null when build missing", () => {
    expect(formatDemoBuildOfWeekLabel(null)).toBeNull();
  });
});
