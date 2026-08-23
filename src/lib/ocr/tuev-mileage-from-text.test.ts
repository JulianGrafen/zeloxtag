import { describe, expect, it } from "vitest";

import {
  extractTuevMileageKmFromText,
  extractTuevPunkt4MileageKmFromText,
  preferTuevMileageKm,
} from "@/lib/ocr/tuev-mileage-from-text";

describe("extractTuevPunkt4MileageKmFromText", () => {
  it("reads Punkt 4 Stand Wegstreckenzähler (TÜV Rheinland)", () => {
    const text = `
(3) Prüftermin: 26.01.2026
(4) Stand Wegstreckenzähler 294 683
(6) Ihr Fahrzeug weist folgende Mängel auf:
    `.trim();

    expect(extractTuevPunkt4MileageKmFromText(text)).toBe(294683);
  });

  it("reads DEKRA (4)Km-St. format", () => {
    expect(extractTuevPunkt4MileageKmFromText("(4)Km-St. 178605")).toBe(178605);
  });

  it("reads (4) and km-St. on separate lines (DEKRA table OCR)", () => {
    const text = `
(4)
km-St.
178605
    `.trim();

    expect(extractTuevPunkt4MileageKmFromText(text)).toBe(178605);
  });

  it("reads (4) and Stand Wegstreckenzähler on separate lines", () => {
    const text = `
(4)
Stand Wegstreckenzähler
294 683 km
    `.trim();

    expect(extractTuevPunkt4MileageKmFromText(text)).toBe(294683);
  });

  it("reads markdown table row with Punkt 4", () => {
    const text = "| (4) | km-St. | 178605 |";
    expect(extractTuevPunkt4MileageKmFromText(text)).toBe(178605);
  });

  it("reads 4. Kilometerstand section label", () => {
    expect(extractTuevPunkt4MileageKmFromText("4. Kilometerstand 85.400 km")).toBe(
      85400,
    );
  });

  it("reads Punkt 4 with colon separator", () => {
    expect(extractTuevPunkt4MileageKmFromText("Punkt 4: 142.350 km")).toBe(142350);
  });

  it("reads KM-Stand on next line after Punkt 4 label", () => {
    const text = `
(4) Stand Wegstreckenzähler
142.350 km
    `.trim();

    expect(extractTuevPunkt4MileageKmFromText(text)).toBe(142350);
  });

  it("ignores Punkt 6 numbers when Punkt 4 is present", () => {
    const text = `
(4) km-St. 120500
(6) Festgestellte Mängel:
4.2.1a Bremsbelag (GM)
    `.trim();

    expect(extractTuevPunkt4MileageKmFromText(text)).toBe(120500);
  });
});

describe("extractTuevMileageKmFromText", () => {
  it("falls back to generic Kilometerstand label when Punkt 4 missing", () => {
    const text = `Kilometerstand: 85.400 km`;
    expect(extractTuevMileageKmFromText(text)).toBe(85400);
  });
});

describe("preferTuevMileageKm", () => {
  it("uses OCR Punkt 4 when LLM mileage is missing", () => {
    expect(
      preferTuevMileageKm(null, "(4)Km-St. 294683"),
    ).toBe(294683);
  });

  it("prefers OCR Punkt 4 over truncated LLM mileage", () => {
    expect(preferTuevMileageKm(17860, "(4)Km-St. 178605")).toBe(178605);
  });

  it("prefers OCR when (4) and km-St. are split across lines", () => {
    const ocr = `
(4)
km-St.
178605
    `.trim();
    expect(preferTuevMileageKm(17860, ocr)).toBe(178605);
  });

  it("returns null without Punkt 4 OCR or LLM mileage", () => {
    expect(
      preferTuevMileageKm(null, "Prüforganisation DEKRA · Ergebnis ohne Mängel"),
    ).toBeNull();
  });
});
