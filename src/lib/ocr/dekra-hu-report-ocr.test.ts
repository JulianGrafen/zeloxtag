import { describe, expect, it } from "vitest";

import {
  DEKRA_HU_REPORT_EXPECTED,
  DEKRA_HU_REPORT_OCR,
} from "@/lib/ocr/fixtures/dekra-hu-report-ocr";
import { extractTuevAmountFromText } from "@/lib/ocr/tuev-amount-from-text";
import { extractTuevDefectsFromText } from "@/lib/ocr/tuev-defects-from-text";
import { extractTuevMileageKmFromText } from "@/lib/ocr/tuev-mileage-from-text";
import { extractTuevTestDateFromText } from "@/lib/ocr/tuev-test-date-from-text";

describe("DEKRA HU report OCR fixture (IMG_7036)", () => {
  it("extracts Punkt 4 km-St.", () => {
    expect(extractTuevMileageKmFromText(DEKRA_HU_REPORT_OCR)).toBe(
      DEKRA_HU_REPORT_EXPECTED.mileageKm,
    );
  });

  it("extracts Punkt 3 Prüfort date", () => {
    expect(extractTuevTestDateFromText(DEKRA_HU_REPORT_OCR)).toBe(
      DEKRA_HU_REPORT_EXPECTED.testDate,
    );
  });

  it("extracts Gesamtbetrag inkl. MwSt (not MwSt line)", () => {
    expect(extractTuevAmountFromText(DEKRA_HU_REPORT_OCR)).toBe(
      DEKRA_HU_REPORT_EXPECTED.amount,
    );
  });

  it("extracts all four Punkt-6 defects with multi-line descriptions", () => {
    const rows = extractTuevDefectsFromText(DEKRA_HU_REPORT_OCR);
    expect(rows).not.toBeNull();
    expect(rows).toHaveLength(4);

    const checkpoints = rows!.map((row) => row.checkpoint);
    expect(checkpoints).toEqual(
      expect.arrayContaining([...DEKRA_HU_REPORT_EXPECTED.defectCheckpoints]),
    );

    expect(rows![0]).toMatchObject({
      checkpoint: "2.6b",
      severity: "EM",
      description: DEKRA_HU_REPORT_EXPECTED.defectDescriptions[0],
    });
    expect(rows![1]).toMatchObject({
      checkpoint: "2.6d",
      severity: "EM",
      description: DEKRA_HU_REPORT_EXPECTED.defectDescriptions[1],
    });
    expect(rows![2]).toMatchObject({
      checkpoint: "5.2.3d",
      severity: "EM",
      description: DEKRA_HU_REPORT_EXPECTED.defectDescriptions[2],
    });
    expect(rows![3]).toMatchObject({
      checkpoint: "D5.2.3c",
      severity: "EM",
      description: DEKRA_HU_REPORT_EXPECTED.defectDescriptions[3],
    });
  });

  it("does not include Hinweise as defects", () => {
    const rows = extractTuevDefectsFromText(DEKRA_HU_REPORT_OCR);
    expect(
      rows!.some((row) => row.description.includes("Bremsbelag vorne")),
    ).toBe(false);
  });
});
