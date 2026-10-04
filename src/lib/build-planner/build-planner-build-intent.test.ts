import { describe, expect, it } from "vitest";

import { assessBuildIntent } from "@/lib/build-planner/build-planner-build-intent";
import { salvagePlannedModExtractFromContext } from "@/lib/build-planner/extract-salvage";

const profile = {
  make: "BMW",
  model: "530d",
  year: 2011,
  engine: "N57",
  powerPs: 245,
  powerKw: 180,
  torqueNm: 520,
  fuelType: "Diesel",
  transmission: "Automatik",
  drivetrain: "RWD",
  notes: null,
  specificationsText: null,
  buildPersonalityLabels: [],
};

describe("assessBuildIntent", () => {
  it("detects track tool goal with typo", () => {
    const result = assessBuildIntent({
      userText: "Ultimatives Trackttol bauen aus dem Touring",
      profile,
    });
    expect(result.kind).toBe("track");
    expect(result.todos.some((t) => t.toLowerCase().includes("bremsen"))).toBe(
      true,
    );
    expect(result.todos.length).toBeGreaterThanOrEqual(6);
  });
});

describe("salvage track goal", () => {
  it("avoids generic project management todos", () => {
    const result = salvagePlannedModExtractFromContext({
      userText: "Ultimatives Trackttol bauen aus dem Touring",
      profile,
    });
    expect(result.todos[0]?.title.toLowerCase()).not.toContain(
      "bedarf und kompatibilität",
    );
    expect(result.part.category).toBe("chassis");
    expect(result.part.plannedPriceEur).toBeGreaterThan(10_000);
  });
});
