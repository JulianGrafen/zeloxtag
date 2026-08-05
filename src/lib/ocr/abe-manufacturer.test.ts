import { describe, expect, it } from "vitest";

import {
  extractAbeManufacturerFromText,
  preferAbeManufacturer,
} from "@/lib/ocr/abe-from-text";

describe("ABE manufacturer extraction", () => {
  it("reads Herstellerzeichen on the same line", () => {
    const text = `
Allgemeine Betriebserlaubnis
Herstellerzeichen: AutoExe
Auftraggeber: AutoExe GmbH
`;
    expect(extractAbeManufacturerFromText(text)).toBe("AutoExe");
  });

  it("reads Hersteller on the next line", () => {
    const text = `
Teilegutachten
Hersteller:
H&R Spezialfedern GmbH & Co. KG
Auftraggeber:
H&R Spezialfedern GmbH & Co. KG
`;
    expect(extractAbeManufacturerFromText(text)).toBe(
      "H&R Spezialfedern GmbH & Co. KG",
    );
  });

  it("keeps manufacturer when it equals Auftraggeber", () => {
    const text = `
ABE KBA 91234
Hersteller: Milltek Sport Ltd
Auftraggeber: Milltek Sport Ltd
`;
    expect(
      preferAbeManufacturer("Milltek Sport Ltd", text),
    ).toBe("Milltek Sport Ltd");
    expect(extractAbeManufacturerFromText(text)).toBe("Milltek Sport Ltd");
  });

  it("uses Genehmigungsinhaber when Hersteller label is missing", () => {
    const text = `
Genehmigungsinhaber: KW automotive GmbH
Verwendungsbereich: BMW 3er
`;
    expect(extractAbeManufacturerFromText(text)).toBe("KW automotive GmbH");
  });

  it("falls back to LLM value when no Hersteller label exists", () => {
    const text = `
Auflagen:
1. Montage nach Anleitung.
`;
    expect(preferAbeManufacturer("OZ Racing", text)).toBe("OZ Racing");
  });
});
