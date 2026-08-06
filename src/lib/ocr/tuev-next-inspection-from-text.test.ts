import { describe, expect, it } from "vitest";

import { extractTuevNextInspectionFromText } from "@/lib/ocr/tuev-next-inspection-from-text";

describe("extractTuevNextInspectionFromText", () => {
  it("parses nächste HU with MM/YYYY", () => {
    expect(
      extractTuevNextInspectionFromText("Ergebnis ohne Mängel\nnächste HU: 05/2028"),
    ).toBe("2028-05");
  });

  it("parses HU fällig with MM.YYYY", () => {
    expect(
      extractTuevNextInspectionFromText("HU fällig: 03.2027"),
    ).toBe("2027-03");
  });

  it("parses gültig bis with MM-YYYY", () => {
    expect(
      extractTuevNextInspectionFromText("Plakette gültig bis 11-2029"),
    ).toBe("2029-11");
  });

  it("parses Fälligkeit with YYYY-MM", () => {
    expect(
      extractTuevNextInspectionFromText("Fälligkeit: 2026-08"),
    ).toBe("2026-08");
  });

  it("parses nächste Hauptuntersuchung with DD.MM.YYYY", () => {
    expect(
      extractTuevNextInspectionFromText(
        "Nächste Hauptuntersuchung: 15.06.2030",
      ),
    ).toBe("2030-06");
  });

  it("handles OCR umlaut variants", () => {
    expect(
      extractTuevNextInspectionFromText("naechste HU: 12/2028"),
    ).toBe("2028-12");
    expect(
      extractTuevNextInspectionFromText("gueltig bis 01.2027"),
    ).toBe("2027-01");
  });

  it("returns null when no labeled date is present", () => {
    expect(
      extractTuevNextInspectionFromText("Prüfdatum: 12.04.2024\nohne Mängel"),
    ).toBeNull();
  });

  it("rejects invalid months", () => {
    expect(
      extractTuevNextInspectionFromText("nächste HU: 13/2028"),
    ).toBeNull();
  });
});
