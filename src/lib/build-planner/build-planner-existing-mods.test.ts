import { describe, expect, it } from "vitest";

import { formatExistingModBullets } from "@/lib/build-planner/build-planner-existing-mods";
import type { VehicleModification } from "@/lib/vehicles/vehicle-modifications";

const sampleMod = (
  overrides: Partial<VehicleModification>,
): VehicleModification => ({
  id: "1",
  category: "Tuning / Teile",
  partName: "KW V3",
  manufacturer: "KW",
  kbaNumber: null,
  approvalStatus: "Rechnung",
  date: "2024-01-01",
  amount: null,
  source: "invoice",
  ...overrides,
});

describe("formatExistingModBullets", () => {
  it("formats bullet lines with manufacturer", () => {
    const bullets = formatExistingModBullets([
      sampleMod({ partName: "Downpipe", manufacturer: "Schmiedmann" }),
      sampleMod({ partName: "KW V3", manufacturer: "KW" }),
    ]);

    expect(bullets[0]).toContain("• Downpipe");
    expect(bullets[0]).toContain("Schmiedmann");
    expect(bullets).toHaveLength(2);
  });

  it("deduplicates identical part and manufacturer", () => {
    const bullets = formatExistingModBullets([
      sampleMod({ partName: "KW V3" }),
      sampleMod({ partName: "KW V3" }),
    ]);
    expect(bullets).toHaveLength(1);
  });
});
