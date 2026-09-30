import { describe, expect, it } from "vitest";

import type { PublicModification } from "@/lib/vehicles/public-showcase-data";

import { buildBuildDnaProfileContext } from "./build-dna-profile-context";
import { computeBuildDnaHeuristic } from "./build-dna-heuristic";

function mod(
  label: string,
  category = "Umbau",
): PublicModification {
  return {
    id: label,
    label,
    category,
    date: null,
    vendor: null,
    source: "manual",
  };
}

describe("computeBuildDnaHeuristic", () => {
  it("boosts handling when coilovers dominate", () => {
    const dna = computeBuildDnaHeuristic([
      mod("KW V3 Coilover"),
      mod("Stahl-Flexlines Bremsscheiben"),
    ]);
    const handling = dna.radar.find((row) => row.category === "Fahrwerk");
    const style = dna.radar.find((row) => row.category === "Optik");
    expect(handling?.score).toBeGreaterThan(style?.score ?? 0);
  });

  it("returns six radar categories and a punchline", () => {
    const dna = computeBuildDnaHeuristic([
      mod("Turbo Kit"),
      mod("Downpipe"),
    ]);
    expect(dna.radar).toHaveLength(6);
    expect(dna.version).toBe(2);
    expect(dna.punchline.length).toBeGreaterThan(10);
  });

  it("boosts acoustics for exhaust-focused mods", () => {
    const dna = computeBuildDnaHeuristic([
      mod("Akrapovic Klappenauspuff"),
      mod("Eventuri Ansaugung"),
    ]);
    const acoustics = dna.radar.find((row) => row.category === "Akustik");
    const street = dna.radar.find((row) => row.category === "Straßenlage");
    expect(acoustics?.score).toBeGreaterThan(street?.score ?? 0);
  });

  it("uses specification text when scoring", () => {
    const mods = [mod("Felgen"), mod("Spoiler")];
    const withoutSpecs = computeBuildDnaHeuristic(mods);
    const profile = buildBuildDnaProfileContext({
      make: "VW",
      model: "Golf",
      year: 2018,
      tech_specs: {
        notes: "KW V3 Coilover, großer Turbo, Klappenauspuff",
        buildPersonalityTags: ["showcar"],
      },
    });
    const withSpecs = computeBuildDnaHeuristic(mods, profile);
    const handlingWithout = withoutSpecs.radar.find(
      (row) => row.category === "Fahrwerk",
    )?.score;
    const handlingWith = withSpecs.radar.find(
      (row) => row.category === "Fahrwerk",
    )?.score;
    expect(handlingWith).toBeGreaterThan(handlingWithout ?? 0);
  });
});
