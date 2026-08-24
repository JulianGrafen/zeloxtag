import { describe, expect, it } from "vitest";

import {
  enrichTeilegutachtenModificationTypeFromOcr,
  extractTeilegutachtenModificationTypeFromText,
  mergeTeilegutachtenModificationType,
} from "@/lib/ocr/teilegutachten-modification-type-from-text";
import type { TeilegutachtenExtraction } from "@/lib/validations/teilegutachtenSchema";

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

  it("parses the complete multi-line block until the next header", () => {
    const text = `
Art der Umrüstung
Sportfahrwerk / Tieferlegung
Abgasananlage
Sportlenkrad
Hersteller: Milltek
Typ: MS-123
`;

    expect(extractTeilegutachtenModificationTypeFromText(text)).toBe(
      "Sportfahrwerk / Tieferlegung\nAbgasananlage\nSportlenkrad",
    );
  });

  it("parses pipe-table style OCR rows", () => {
    const text = `
| Art der Umrüstung | Abgasanlage |
| Hersteller | Milltek |
`;

    expect(extractTeilegutachtenModificationTypeFromText(text)).toBe(
      "Abgasanlage",
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
  it("prefers LLM value when it is longer than heuristic", () => {
    expect(
      mergeTeilegutachtenModificationType(
        "Leistungssteigerung\nAbgasananlage",
        "Sportfahrwerk",
      ),
    ).toBe("Leistungssteigerung\nAbgasananlage");
  });

  it("falls back to heuristic when LLM value is empty", () => {
    expect(
      mergeTeilegutachtenModificationType(null, "  Sonderfahrwerksfedern "),
    ).toBe("Sonderfahrwerksfedern");
  });

  it("prefers the longer OCR block when LLM truncated", () => {
    expect(
      mergeTeilegutachtenModificationType(
        "Sportfahrwerk",
        "Sportfahrwerk / Tieferlegung\nAbgasananlage",
      ),
    ).toBe("Sportfahrwerk / Tieferlegung\nAbgasananlage");
  });
});

describe("enrichTeilegutachtenModificationTypeFromOcr", () => {
  const base: TeilegutachtenExtraction = {
    documentType: "Teilegutachten",
    certificateNumber: "TG-1",
      issueDate: null,
    manufacturer: "Eibach",
    partCategory: null,
    modificationType: "Sportfahrwerk",
    partType: null,
    physicalMarking: null,
    markingType: null,
    markingNumber: null,
    requiresPhysicalInspection: true,
    testingOrganization: "TÜV",
    userVehicleMatchStatus: null,
    verwendungsbereich: null,
    auflagen: null,
    matchedVehicleRow: null,
    compatibilityTable: null,
    technicalDataTable: null,
    ownerNotes: null,
  };

  it("extends truncated LLM modificationType from OCR text", () => {
    const ocr = `
Art der Umrüstung
Sportfahrwerk / Tieferlegung
Abgasananlage
Hersteller: Eibach
`;

    const enriched = enrichTeilegutachtenModificationTypeFromOcr(base, ocr);

    expect(enriched.modificationType).toBe(
      "Sportfahrwerk / Tieferlegung\nAbgasananlage",
    );
  });
});
