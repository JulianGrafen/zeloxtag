import { describe, expect, it } from "vitest";

import type { PublicModification } from "@/lib/vehicles/public-showcase-data";

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

  it("returns four radar categories and a punchline", () => {
    const dna = computeBuildDnaHeuristic([
      mod("Turbo Kit"),
      mod("Downpipe"),
    ]);
    expect(dna.radar).toHaveLength(4);
    expect(dna.punchline.length).toBeGreaterThan(10);
  });
});
