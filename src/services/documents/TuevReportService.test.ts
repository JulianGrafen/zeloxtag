import { describe, expect, it } from "vitest";

import { inferResultFromDefectRows } from "@/services/documents/TuevReportService";

describe("inferResultFromDefectRows", () => {
  it("returns no_defects when the table is empty", () => {
    expect(inferResultFromDefectRows(null, "minor_defects")).toBe("no_defects");
  });

  it("returns major_defects when any row is EM", () => {
    expect(
      inferResultFromDefectRows(
        [{ checkpoint: "1.3.2", description: "Bremsbelag", severity: "EM" }],
        "no_defects",
      ),
    ).toBe("major_defects");
  });

  it("returns minor_defects for GM-only rows", () => {
    expect(
      inferResultFromDefectRows(
        [{ checkpoint: "2.1.1", description: "Reifen", severity: "GM" }],
        "no_defects",
      ),
    ).toBe("minor_defects");
  });

  it("preserves failed and dangerous results", () => {
    expect(
      inferResultFromDefectRows(
        [{ checkpoint: "1.1.1", description: "Test", severity: "GM" }],
        "failed",
      ),
    ).toBe("failed");
  });
});
