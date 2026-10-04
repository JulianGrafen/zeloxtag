import { describe, expect, it } from "vitest";

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
  drivetrain: "Heckantrieb",
  notes: null,
  specificationsText: "Motor: N57 · Leistung: 245 PS",
  buildPersonalityLabels: [],
};

describe("salvagePlannedModExtractFromContext", () => {
  it("builds a stage package from PS goal and saved profile", () => {
    const result = salvagePlannedModExtractFromContext({
      userText: "Den BMW auf 400 PS bringen",
      profile,
    });

    expect(result.part.title).toContain("400");
    expect(result.part.plannedPriceEur).toBeGreaterThan(10_000);
    expect(result.todos.length).toBeGreaterThanOrEqual(4);
    expect(result.todos[0]?.title.toLowerCase()).toContain("turbo");
  });
});
