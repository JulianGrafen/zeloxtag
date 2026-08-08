import { describe, expect, it } from "vitest";

import {
  ABE_VEHICLE_MODEL_DISPLAY_LABEL,
  displayLabelForAbeSpecLabel,
  displaySpecForAbeDetailView,
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

  it("maps Verkaufsbezeichnung to Fahrzeugmodell for display", () => {
    expect(displayLabelForAbeSpecLabel("Verkaufsbezeichnung")).toBe(
      ABE_VEHICLE_MODEL_DISPLAY_LABEL,
    );
    expect(displaySpecForAbeDetailView({
      label: "Verkaufsbezeichnung",
      value: "5ER REIHE",
    })).toEqual({
      label: ABE_VEHICLE_MODEL_DISPLAY_LABEL,
      value: "5ER REIHE",
    });
  });

  it("shows Fahrzeugmodell in technical specs for detail view", () => {
    const specs = technicalSpecsForAbeDetailView([
      { label: "ABE-Nummer", value: "123" },
      { label: "Verkaufsbezeichnung", value: "5ER REIHE" },
      { label: "Kennzeichnung", value: "ABC" },
    ]);
    expect(specs).toEqual([
      { label: ABE_VEHICLE_MODEL_DISPLAY_LABEL, value: "5ER REIHE" },
      { label: "Kennzeichnung", value: "ABC" },
    ]);
  });

  it("adds Fahrzeugmodell from approval_fields when missing in specs", () => {
    const specs = technicalSpecsForAbeDetailView(
      [{ label: "Kennzeichnung", value: "ABC" }],
      { vehicleModel: "5ER REIHE" },
    );
    expect(specs).toEqual([
      { label: "Kennzeichnung", value: "ABC" },
      { label: ABE_VEHICLE_MODEL_DISPLAY_LABEL, value: "5ER REIHE" },
    ]);
  });

  it("filters duplicate model line from vehicle approvals", () => {
    const approvals = vehicleApprovalsForAbeDetailView(["5ER REIHE", "E90 320d"], {
      verkaufsbezeichnung: "5ER REIHE",
      technicalSpecs: [],
    });
    expect(approvals).toEqual(["E90 320d"]);
  });
});
