import { describe, expect, it } from "vitest";

import { OCR_SAMPLES } from "@/lib/ocr/__fixtures__/ocr-samples";
import {
  mergeTuevDefectsHybrid,
  mergeTuevHybridReport,
} from "@/lib/ocr/tuev-hybrid-merge";
import type { TuevReport } from "@/lib/validations/documentSchemas";

function baseLlmReport(overrides: Partial<TuevReport> = {}): TuevReport {
  return {
    testingOrganization: "TÜV",
    testDate: "2026-03-12",
    result: "no_defects",
    mileageKm: 99_999,
    nextInspectionDate: "2028-05",
    documentNumber: "HU-2026-001",
    defectsTable: null,
    defectsList: null,
    ...overrides,
  };
}

describe("mergeTuevDefectsHybrid · anti-hallucination", () => {
  it("discards LLM defects when Punkt 6 is present but empty (mangelfrei)", () => {
    const llm = baseLlmReport({
      result: "minor_defects",
      defectsTable: [
        {
          checkpoint: "4.2.1a",
          description: "Halluzinierter Scheinwerferdefekt",
          severity: "GM",
        },
      ],
      defectsList: ["[4.2.1a] Halluzinierter Scheinwerferdefekt (GM)"],
    });

    const merged = mergeTuevDefectsHybrid(llm, OCR_SAMPLES.tuevReportMangelfreiPunkt6);

    expect(merged.defectsTable).toBeNull();
    expect(merged.defectsList).toBeNull();
  });

  it("prefers heuristic Punkt-6 defects over LLM when OCR finds real rows", () => {
    const llm = baseLlmReport({
      defectsTable: [
        {
          checkpoint: "9.9.9",
          description: "LLM erfundener Mangel",
          severity: "EM",
        },
      ],
      defectsList: ["[9.9.9] LLM erfundener Mangel (EM)"],
    });

    const merged = mergeTuevDefectsHybrid(llm, OCR_SAMPLES.tuevReportMinorDefects);

    expect(merged.defectsTable).toHaveLength(2);
    expect(merged.defectsTable?.[0]?.checkpoint).toBe("4.2.1a");
    expect(merged.defectsTable?.[0]?.description).toMatch(/bremsbelag/i);
    expect(merged.defectsTable?.some((row) => /erfundener/i.test(row.description))).toBe(
      false,
    );
  });

  it("falls back to LLM defects when Punkt 6 section is absent in OCR", () => {
    const llm = baseLlmReport({
      defectsTable: [
        {
          checkpoint: "1.3.2",
          description: "Bremsbelag vorn",
          severity: "GM",
        },
      ],
      defectsList: null,
    });

    const merged = mergeTuevDefectsHybrid(llm, "Kurzer OCR-Text ohne Mängelabschnitt");

    expect(merged.defectsTable).toHaveLength(1);
    expect(merged.defectsTable?.[0]?.description).toMatch(/bremsbelag/i);
  });
});

describe("mergeTuevHybridReport · KM-Stand", () => {
  it("prefers OCR header KM-Stand over wrong LLM mileage", () => {
    const llm = baseLlmReport({ mileageKm: 12_345 });

    const merged = mergeTuevHybridReport(llm, OCR_SAMPLES.tuevReportHeaderKmStand);

    expect(merged.mileageKm).toBe(142_350);
  });

  it("keeps LLM mileage when OCR header has no KM-Stand", () => {
    const llm = baseLlmReport({ mileageKm: 85_400 });

    const merged = mergeTuevHybridReport(
      llm,
      "Untersuchungsbericht\nErgebnis: ohne Mängel\nPrüforganisation: TÜV",
    );

    expect(merged.mileageKm).toBe(85_400);
  });
});
