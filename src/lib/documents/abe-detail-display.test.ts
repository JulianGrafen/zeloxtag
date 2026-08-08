import { describe, expect, it } from "vitest";

import {
  isVerkaufsbezeichnungSpecLabel,
  technicalSpecsForAbeDetailView,
  vehicleApprovalsForAbeDetailView,
} from "@/lib/documents/abe-detail-display";

describe("abe-detail-display", () => {
  it("detects Verkaufsbezeichnung spec labels", () => {
    expect(isVerkaufsbezeichnungSpecLabel("Verkaufsbezeichnung")).toBe(true);
    expect(isVerkaufsbezeichnungSpecLabel("Verkaufsbezeichnung (Fahrzeugfreigabe)")).toBe(
      true,
    );
    expect(isVerkaufsbezeichnungSpecLabel("Kennzeichnung")).toBe(false);
  });

  it("filters Verkaufsbezeichnung from technical specs", () => {
    const specs = technicalSpecsForAbeDetailView([
      { label: "ABE-Nummer", value: "123" },
      { label: "Verkaufsbezeichnung", value: "5ER REIHE" },
      { label: "Kennzeichnung", value: "ABC" },
    ]);
    expect(specs.map((spec) => spec.label)).toEqual(["Kennzeichnung"]);
  });

  it("filters Verkaufsbezeichnung from vehicle approvals", () => {
    const approvals = vehicleApprovalsForAbeDetailView(["5ER REIHE", "E90 320d"], {
      verkaufsbezeichnung: "5ER REIHE",
      technicalSpecs: [],
    });
    expect(approvals).toEqual(["E90 320d"]);
  });
});
