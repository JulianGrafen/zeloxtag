import { describe, expect, it } from "vitest";

import { buildBuildDnaProfileContext } from "@/lib/showcase/build-dna-profile-context";
import {
  buildShowcaseBuildDnaFingerprint,
  buildShowcaseModsFingerprint,
} from "@/lib/showcase/build-dna-fingerprint";
import type { PublicModification } from "@/lib/vehicles/public-showcase-data";
import type { Vehicle } from "@/types/database";

function mod(id: string, label: string): PublicModification {
  return {
    id,
    label,
    category: "Umbau",
    date: null,
    vendor: null,
    source: "manual",
  };
}

const baseVehicle: Pick<Vehicle, "make" | "model" | "year" | "tech_specs"> = {
  make: "Mazda",
  model: "RX-8",
  year: 2004,
  tech_specs: { powerPs: 231, notes: "Serienstand" },
};

describe("buildShowcaseBuildDnaFingerprint", () => {
  it("changes when specifications text changes", () => {
    const mods = [mod("a", "Turbo"), mod("b", "Coilover")];
    const profileA = buildBuildDnaProfileContext(baseVehicle);
    const profileB = buildBuildDnaProfileContext({
      ...baseVehicle,
      tech_specs: { powerPs: 231, notes: "Vollumbau mit Turbo" },
    });

    const fpA = buildShowcaseBuildDnaFingerprint(mods, profileA);
    const fpB = buildShowcaseBuildDnaFingerprint(mods, profileB);
    expect(fpA).not.toBe(fpB);
  });

  it("mods-only fingerprint stays stable for legacy helper", () => {
    const mods = [mod("a", "Turbo"), mod("b", "Coilover")];
    expect(buildShowcaseModsFingerprint(mods)).toMatch(/^v3:/);
  });
});
