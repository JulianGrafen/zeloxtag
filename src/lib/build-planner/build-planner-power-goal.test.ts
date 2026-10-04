import { describe, expect, it } from "vitest";

import {
  assessPowerGoal,
  extractTargetPsFromText,
} from "@/lib/build-planner/build-planner-power-goal";
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

describe("assessPowerGoal", () => {
  it("classifies 400 PS from 245 PS baseline as ambitious", () => {
    const result = assessPowerGoal({
      userText: "auf 400 PS bringen",
      profile,
    });
    expect(result?.tier).toBe("ambitious");
    expect(result?.estimatedPriceEur).toBeGreaterThan(10_000);
  });

  it("classifies 800 PS from 245 PS baseline as extreme", () => {
    const result = assessPowerGoal({
      userText: "800 PS",
      profile,
    });
    expect(result?.tier).toBe("extreme");
    expect(result?.extraTodos.length).toBeGreaterThan(3);
    expect(result?.contextLines.some((line) => line.includes("Stretch"))).toBe(
      true,
    );
  });
});

describe("extractTargetPsFromText", () => {
  it("parses PS from German text", () => {
    expect(extractTargetPsFromText("Den BMW auf 400 PS bringen")).toBe(400);
  });
});

describe("salvage extreme goal", () => {
  it("uses stretch title and higher price for 800 PS", () => {
    const result = salvagePlannedModExtractFromContext({
      userText: "800 PS",
      profile,
    });
    expect(result.part.title.toLowerCase()).toContain("stretch");
    expect(result.part.plannedPriceEur).toBeGreaterThan(20_000);
    expect(result.todos.length).toBeGreaterThanOrEqual(6);
  });
});
