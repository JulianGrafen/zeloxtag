import { describe, expect, it } from "vitest";

import { extractVehicleApprovals } from "@/lib/ocr/abe-from-text";
import {
  isPlausibleVehicleApproval,
  normalizeAbeVehicleApprovals,
} from "@/lib/ocr/abe-parse-schema";
import { OCR_SAMPLES } from "@/lib/ocr/__fixtures__/ocr-samples";

describe("ABE Freigabe / vehicleApprovals", () => {
  it("rejects bare numbers and type-only codes", () => {
    expect(isPlausibleVehicleApproval("184")).toBe(false);
    expect(isPlausibleVehicleApproval("0005")).toBe(false);
    expect(isPlausibleVehicleApproval("SE3P")).toBe(false);
    expect(isPlausibleVehicleApproval("Mazda RX-8")).toBe(true);
    expect(isPlausibleVehicleApproval("BMW 3er (E90)")).toBe(true);
  });

  it("normalizes and drops numeric noise", () => {
    expect(
      normalizeAbeVehicleApprovals([
        "Mazda RX-8",
        "184",
        "SE3P",
        "VW Golf VII",
        "Mazda RX-8",
      ]),
    ).toEqual(["Mazda RX-8", "VW Golf VII"]);
  });

  it("extracts make/model lines and ignores bare numbers", () => {
    const approvals = extractVehicleApprovals(OCR_SAMPLES.classicAbe);
    expect(approvals).toEqual(
      expect.arrayContaining(["Mazda RX-8 (SE3P)", "BMW 3er (E90)", "VW Golf VII"]),
    );
    expect(approvals?.some((value) => /^\d+$/.test(value))).toBe(false);
    expect(approvals).not.toContain("184");
    expect(approvals).not.toContain("HSN 0005");
  });
});
