import { describe, expect, it } from "vitest";

import { OCR_SAMPLES } from "@/lib/ocr/__fixtures__/ocr-samples";
import {
  extractMileageKmFromText,
  extractTuevPunkt4MileageKm,
  hasTuevPunkt4MileageSection,
  preferTuevHeaderMileageKm,
} from "@/lib/ocr/mileage-from-text";

describe("extractTuevPunkt4MileageKm", () => {
  it("parses (4) Kilometerstand with value on next line", () => {
    const text = `
Untersuchungsbericht nach § 29 StVZO
Kennzeichen: M-AB 1234
Prüfdatum: 15.04.2026
(4) Kilometerstand
142.350 km
(6) Festgestellte Mängel
mangelfrei
`.trim();

    expect(hasTuevPunkt4MileageSection(text)).toBe(true);
    expect(extractTuevPunkt4MileageKm(text)).toBe(142_350);
  });

  it("parses 4. Kilometerstand inline", () => {
    const text = `
4. Kilometerstand: 187.420 km
5. Nächste HU
`.trim();

    expect(extractTuevPunkt4MileageKm(text)).toBe(187_420);
  });

  it("parses 4 KM-Stand without dot separator", () => {
    const text = `
4 KM-Stand 120500
6 Festgestellte Mängel
`.trim();

    expect(extractTuevPunkt4MileageKm(text)).toBe(120_500);
  });

  it("parses Feld 4 with value on following line", () => {
    const text = `
Feld 4
98 765 km
Feld 5
`.trim();

    expect(extractTuevPunkt4MileageKm(text)).toBe(98_765);
  });

  it("returns null when Punkt 4 section is absent", () => {
    expect(extractTuevPunkt4MileageKm(OCR_SAMPLES.oilChangeInvoice)).toBeNull();
  });
});

describe("preferTuevHeaderMileageKm · Punkt 4 priority", () => {
  it("prefers Punkt 4 over conflicting header KM-Stand", () => {
    const text = `
KM-Stand: 99.999 km
Kennzeichen: M-AB 1234
4. Kilometerstand: 187.420 km
`.trim();

    expect(extractMileageKmFromText(text)).toBe(99_999);
    expect(preferTuevHeaderMileageKm(12_345, text)).toBe(187_420);
  });

  it("falls back to header when Punkt 4 is absent", () => {
    expect(
      preferTuevHeaderMileageKm(12_345, OCR_SAMPLES.tuevReportHeaderKmStand),
    ).toBe(142_350);
  });

  it("falls back to LLM when neither Punkt 4 nor header match", () => {
    const text = "Untersuchungsbericht\nErgebnis: ohne Mängel";
    expect(preferTuevHeaderMileageKm(85_400, text)).toBe(85_400);
  });

  it("prefers Punkt 4 fixture over wrong LLM mileage", () => {
    expect(
      preferTuevHeaderMileageKm(12_345, OCR_SAMPLES.tuevReportPunkt4KmStand),
    ).toBe(156_800);
  });
});
