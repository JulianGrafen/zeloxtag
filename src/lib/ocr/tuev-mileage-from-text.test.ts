import { describe, expect, it } from "vitest";

import {
  extractTuevMileageKmFromText,
  preferTuevMileageKm,
} from "@/lib/ocr/tuev-mileage-from-text";

describe("extractTuevMileageKmFromText", () => {
  it("reads Punkt 4 Stand Wegstreckenzähler (TÜV Rheinland)", () => {
    const text = `
(3) Prüftermin: 26.01.2026
(4) Stand Wegstreckenzähler 294 683
(6) Ihr Fahrzeug weist folgende Mängel auf:
    `.trim();

    expect(extractTuevMileageKmFromText(text)).toBe(294683);
  });

  it("reads DEKRA (4)Km-St. format", () => {
    const text = `(4)Km-St. 178605`;
    expect(extractTuevMileageKmFromText(text)).toBe(178605);
  });

  it("reads KM-Stand on next line after Punkt 4 label", () => {
    const text = `
(4) Stand Wegstreckenzähler
142.350 km
    `.trim();

    expect(extractTuevMileageKmFromText(text)).toBe(142350);
  });

  it("falls back to generic Kilometerstand label", () => {
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

  it("keeps valid LLM mileage", () => {
    expect(preferTuevMileageKm(178605, "(4)Km-St. 999999")).toBe(178605);
  });
});
