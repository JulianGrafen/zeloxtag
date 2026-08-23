import { describe, expect, it } from "vitest";

import {
  DEKRA_HU_REPORT_EXPECTED,
  DEKRA_HU_REPORT_OCR,
} from "@/lib/ocr/fixtures/dekra-hu-report-ocr";
import { OCR_SAMPLES } from "@/lib/ocr/__fixtures__/ocr-samples";
import {
  enrichTuevRecordFromOcrText,
  reconcileTuevDefectRows,
} from "@/lib/ocr/tuev-enrichment";
import {
  extractTuevTestDateFromText,
  preferTuevTestDate,
} from "@/lib/ocr/tuev-test-date-from-text";

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

  it("drops invented LLM defects when OCR Punkt 6 is authoritative", () => {
    const enriched = enrichTuevRecordFromOcrText(
      {
        result: "major_defects",
        defectsTable: [
          {
            checkpoint: "9.9.9",
            description: "Erfundener Mangel aus dem LLM",
            severity: "EM",
          },
          {
            checkpoint: "2.6b",
            description: "Elektromechanische Servolenkung Unterstützungsmoment mangelhaft",
            severity: "EM",
          },
        ],
      },
      DEKRA_HU_REPORT_OCR,
    );

    const table = enriched.defectsTable as Array<{ checkpoint: string | null }>;
    expect(table).toHaveLength(4);
    expect(table.some((row) => row.checkpoint === "9.9.9")).toBe(false);
  });

  it("prefers OCR Punkt-3 date over a wrong LLM date", () => {
    const enriched = enrichTuevRecordFromOcrText(
      {
        testDate: "2020-01-15",
        mileageKm: null,
        amount: null,
      },
      DEKRA_HU_REPORT_OCR,
    );

    expect(enriched.testDate).toBe("2021-03-23");
  });

  it("prefers OCR Punkt-4 mileage over a wrong LLM value", () => {
    const enriched = enrichTuevRecordFromOcrText(
      {
        mileageKm: 17860,
        testDate: null,
        amount: null,
      },
      DEKRA_HU_REPORT_OCR,
    );

    expect(enriched.mileageKm).toBe(178605);
  });

  it("uses fee sum when LLM returned MwSt-only amount without OCR fee block", () => {
    const enriched = enrichTuevRecordFromOcrText(
      {
        testDate: "2026-03-12",
        mileageKm: null,
        amount: 19.96,
        lineItems: [
          { label: "Hauptuntersuchung", amount: 123.81 },
          { label: "MwSt 19%", amount: 19.96 },
        ],
      },
      OCR_SAMPLES.tuevReportPass,
    );

    expect(enriched.amount).toBe(125);
  });
});

describe("reconcileTuevDefectRows", () => {
  it("returns null when Punkt 6 exists but OCR finds no rows and LLM invented defects", () => {
    const reconciled = reconcileTuevDefectRows(
      [
        {
          checkpoint: "4.4.4",
          description: "Bremsflüssigkeit undicht",
          severity: "EM",
        },
      ],
      `
(6) Festgestellte Mängel:
Hinweise:
- Bremsbelag vorne in Kürze verschlissen
`.trim(),
    );

    expect(reconciled).toBeNull();
  });

  it("keeps LLM checkpoint verbatim when OCR parser misreads the Prüfpunkt", () => {
    const reconciled = reconcileTuevDefectRows(
      [
        {
          checkpoint: "2.6b",
          description: "Elektromechanische Servolenkung Unterstützungsmoment mangelhaft",
          severity: "EM",
        },
      ],
      `
6. Festgestellte Mängel
2.6.1 (EM)
Elektromechanische Servolenkung Unterstützungsmoment mangelhaft
`.trim(),
    );

    expect(reconciled).toHaveLength(1);
    expect(reconciled?.[0]?.checkpoint).toBe("2.6b");
  });
});

describe("preferTuevTestDate", () => {
  it("extracts DEKRA Prüfort date from Punkt 3", () => {
    expect(extractTuevTestDateFromText("(3) Prüfort Mechernich, 23.03.2021")).toBe(
      "2021-03-23",
    );
  });

  it("rejects LLM dates from forbidden fields", () => {
    const ocr = `
(2) Erstzulassung 15.01.2020
(3) Prüfort Mechernich, 23.03.2021
`.trim();

    expect(preferTuevTestDate("2020-01-15", ocr)).toBe("2021-03-23");
  });

  it("accepts TÜV Rheinland Prüftermin with time suffix", () => {
    const ocr = "(3) Prüftermin: 26.01.2026, 10:21 Uhr";
    expect(preferTuevTestDate("2026-01-26", ocr)).toBe("2026-01-26");
  });

  it("reads Prüfungsdatum label in report header", () => {
    expect(
      extractTuevTestDateFromText("Prüfungsdatum: 18.08.2026"),
    ).toBe("2026-08-18");
  });

  it("reads Punkt-3 date split across lines", () => {
    const ocr = `
(3) Prüfort
Mechernich, 23.03.2021
(4) km-St. 178605
`.trim();
    expect(extractTuevTestDateFromText(ocr)).toBe("2021-03-23");
  });

  it("accepts LLM date near (3) marker when OCR layout is noisy", () => {
    const ocr = `
(3)
Prüfort Mechernich
23.03.2021
`.trim();
    expect(preferTuevTestDate("2021-03-23", ocr)).toBe("2021-03-23");
  });
});
