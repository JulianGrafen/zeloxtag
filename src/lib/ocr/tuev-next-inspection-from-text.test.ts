import { describe, expect, it } from "vitest";

import { OCR_SAMPLES } from "@/lib/ocr/__fixtures__/ocr-samples";

import { extractTuevNextInspectionFromText } from "@/lib/ocr/tuev-next-inspection-from-text";

describe("extractTuevNextInspectionFromText", () => {
  it("parses nächste HU with MM/YYYY", () => {
    expect(
      extractTuevNextInspectionFromText("Ergebnis ohne Mängel\nnächste HU: 05/2028"),
    ).toBe("2028-05");
  });

  it("parses nächste Untersuchung and OCR label variants", () => {
    expect(
      extractTuevNextInspectionFromText("nächste Untersuchung: 05/2028"),
    ).toBe("2028-05");
    expect(
      extractTuevNextInspectionFromText("Nächste Untertsuchung: 09/2028"),
    ).toBe("2028-09");
    expect(
      extractTuevNextInspectionFromText(
        "Termin der nächsten Untersuchung: 08/2029",
      ),
    ).toBe("2029-08");
    expect(
      extractTuevNextInspectionFromText("fällige Untersuchung: 03.2027"),
    ).toBe("2027-03");
    expect(
      extractTuevNextInspectionFromText(`
Ergebnis: ohne Mängel
Nächste Untersuchung
07/2028
      `),
    ).toBe("2028-07");
  });

  it("parses from OCR fixture sample", () => {
    expect(extractTuevNextInspectionFromText(OCR_SAMPLES.tuevReportPass)).toBe(
      "2028-05",
    );
    expect(
      extractTuevNextInspectionFromText(OCR_SAMPLES.tuevReportMinorDefects),
    ).toBe("2028-07");
  });

  it("parses HU fällig with MM.YYYY", () => {
    expect(
      extractTuevNextInspectionFromText("HU fällig: 03.2027"),
    ).toBe("2027-03");
  });

  it("parses gültig bis with MM-YYYY and spaced slash", () => {
    expect(
      extractTuevNextInspectionFromText("Plakette gültig bis 11-2029"),
    ).toBe("2029-11");
    expect(
      extractTuevNextInspectionFromText("Prüfplakette gültig bis 05 / 2028"),
    ).toBe("2028-05");
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

  it("parses Termin der nächsten HU", () => {
    expect(
      extractTuevNextInspectionFromText(
        "Termin der nächsten Hauptuntersuchung (HU): 08/2029",
      ),
    ).toBe("2029-08");
  });

  it("parses HU-Termin with pipe-separated OCR", () => {
    expect(
      extractTuevNextInspectionFromText("HU-Termin | 12/2027"),
    ).toBe("2027-12");
  });

  it("parses date on the line after the label", () => {
    expect(
      extractTuevNextInspectionFromText(`
Ergebnis: ohne Mängel
Nächste HU
05/2028
Vorgangs-Nr.: HU-991
      `),
    ).toBe("2028-05");
  });

  it("parses German month name", () => {
    expect(
      extractTuevNextInspectionFromText("Nächste HU: Mai 2028"),
    ).toBe("2028-05");
  });

  it("handles OCR umlaut variants", () => {
    expect(
      extractTuevNextInspectionFromText("naechste HU: 12/2028"),
    ).toBe("2028-12");
    expect(
      extractTuevNextInspectionFromText("nachste HU: 04/2028"),
    ).toBe("2028-04");
    expect(
      extractTuevNextInspectionFromText("nchste HU: 06/2028"),
    ).toBe("2028-06");
    expect(
      extractTuevNextInspectionFromText("gueltig bis 01.2027"),
    ).toBe("2027-01");
  });

  it("ignores Nachprüfung deadline, not next HU", () => {
    expect(
      extractTuevNextInspectionFromText(`
Die Nachprüfung der Beseitigung aller Mängel kann bis spätestens 27.04.2025 erfolgen.
Bitte legen Sie dafür diesen Untersuchungsbericht wieder vor.
      `),
    ).toBeNull();
  });

  it("ignores closing letter boilerplate with nächste Untersuchung", () => {
    expect(
      extractTuevNextInspectionFromText(`
Wir bedanken uns für Ihr in uns gesetztes Vertrauen und freuen uns darauf,
Sie zur nächsten Untersuchung erneut begrüßen zu dürfen.
      `),
    ).toBeNull();
  });

  it("prefers next HU over Nachprüfung when both appear", () => {
    expect(
      extractTuevNextInspectionFromText(`
nächste HU: 05/2028
Die Nachprüfung der Beseitigung aller Mängel kann bis spätestens 27.04.2025 erfolgen.
      `),
    ).toBe("2028-05");
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
