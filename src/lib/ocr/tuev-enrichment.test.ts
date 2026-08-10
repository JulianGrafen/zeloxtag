import { describe, expect, it } from "vitest";

import {
  DEKRA_HU_REPORT_EXPECTED,
  DEKRA_HU_REPORT_OCR,
} from "@/lib/ocr/fixtures/dekra-hu-report-ocr";
import { enrichTuevRecordFromOcrText } from "@/lib/ocr/tuev-enrichment";

describe("enrichTuevRecordFromOcrText — DEKRA fixture", () => {
  it("fills missing LLM fields from OCR text", () => {
    const enriched = enrichTuevRecordFromOcrText(
      {
        testDate: null,
        mileageKm: null,
        amount: 19.96,
        result: "major_defects",
        defectsTable: [],
        defectsList: [],
      },
      DEKRA_HU_REPORT_OCR,
    );

    expect(enriched.mileageKm).toBe(DEKRA_HU_REPORT_EXPECTED.mileageKm);
    expect(enriched.testDate).toBe(DEKRA_HU_REPORT_EXPECTED.testDate);
    expect(enriched.amount).toBe(DEKRA_HU_REPORT_EXPECTED.amount);

    const table = enriched.defectsTable as Array<{ checkpoint: string | null }>;
    expect(table).toHaveLength(4);
    expect(table.map((row) => row.checkpoint)).toEqual(
      expect.arrayContaining([...DEKRA_HU_REPORT_EXPECTED.defectCheckpoints]),
    );
  });
});
