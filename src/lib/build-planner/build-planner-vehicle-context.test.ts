import { describe, expect, it } from "vitest";

import { formatBuildPlannerVehicleContext } from "@/lib/build-planner/build-planner-vehicle-context";
import { BUILD_DNA_RADAR_CATEGORIES } from "@/lib/showcase/build-dna-schema";

describe("formatBuildPlannerVehicleContext", () => {
  it("includes vehicle specs and planned mods", () => {
    const text = formatBuildPlannerVehicleContext({
      profile: {
        make: "BMW",
        model: "335i",
        year: 2012,
        engine: "N55",
        powerPs: 306,
        powerKw: 225,
        torqueNm: 400,
        fuelType: "Benzin",
        transmission: "Automatik",
        drivetrain: "RWD",
        notes: null,
        specificationsText:
          "Motor: N55 · Leistung: 306 PS · 225 kW · Drehmoment: 400 Nm",
        buildPersonalityLabels: ["Daily + Track"],
      },
      buildDna: {
        version: 2,
        archetype: "Heimlicher Renner",
        punchline: "Unauffällig, aber ernst.",
        radar: BUILD_DNA_RADAR_CATEGORIES.map((category) => ({
          category,
          score: 50,
        })),
      },
      plannedModTitles: ["Downpipe"],
      existingModBullets: [
        "• KW V3 (KW)",
        "• Intercooler Upgrade (Wagner)",
      ],
    });

    expect(text).toContain("BMW 335i (2012)");
    expect(text).toContain("Bisherige Umbauten");
    expect(text).toContain("KW V3");
    expect(text).toContain("306 PS");
    expect(text).toContain("Build-DNA");
    expect(text).toContain("Downpipe");
  });
});
