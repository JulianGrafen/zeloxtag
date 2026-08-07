import { describe, expect, it } from "vitest";

import {
  extractTeilegutachtenModificationTypeFromText,
  mergeTeilegutachtenModificationType,
} from "@/lib/ocr/teilegutachten-modification-type-from-text";

describe("extractTeilegutachtenModificationTypeFromText", () => {
  it("parses inline Art der Umrüstung with colon", () => {
    const text = `
Teilegutachten gem. § 19 Abs. 3 StVZO
Art der Umrüstung: Sonderfahrwerksfedern
Hersteller: Eibach
Typ: 21-85-041-01-VA
`;

    expect(extractTeilegutachtenModificationTypeFromText(text)).toBe(
      "Sonderfahrwerksfedern",
    );
  });

  it("parses value on the line after the heading", () => {
    const text = `
Art der Umrüstung
Sportfahrwerk / Tieferlegung
Hersteller Eibach
`;

    expect(extractTeilegutachtenModificationTypeFromText(text)).toBe(
      "Sportfahrwerk / Tieferlegung",
    );
  });

  it("parses pipe-table style OCR rows", () => {
    const text = `
| Art der Umrüstung | Abgasananlage |
| Hersteller | Milltek |
`;

    expect(extractTeilegutachtenModificationTypeFromText(text)).toBe(
      "Abgasananlage",
    );
  });

  it("returns null when heading is absent", () => {
    expect(
      extractTeilegutachtenModificationTypeFromText(
        "Teilegutachten\nHersteller: Eibach",
      ),
    ).toBeNull();
  });
});

describe("mergeTeilegutachtenModificationType", () => {
  it("prefers LLM value over heuristic", () => {
    expect(
      mergeTeilegutachtenModificationType(
        "Leistungssteigerung",
        "Sportfahrwerk",
      ),
    ).toBe("Leistungssteigerung");
  });

  it("falls back to heuristic when LLM value is empty", () => {
    expect(
      mergeTeilegutachtenModificationType(null, "  Sonderfahrwerksfedern "),
    ).toBe("Sonderfahrwerksfedern");
  });
});
