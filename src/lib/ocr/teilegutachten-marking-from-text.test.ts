import { describe, expect, it } from "vitest";

import {
  extractMarkingFromTechnicalTable,
  extractTeilegutachtenMarkingFromText,
  formatTeilegutachtenPhysicalMarking,
  mergeTeilegutachtenMarking,
  normalizeTeilegutachtenMarking,
} from "@/lib/ocr/teilegutachten-marking-from-text";

describe("extractTeilegutachtenMarkingFromText", () => {
  it("parses Art der Kennzeichnung and Nummer inline", () => {
    const text = `
Kennzeichnung:
Art der Kennzeichnung: Aufdruck auf den Federwindungen
Nummer: e1*47656
Unterschrift
`;

    expect(extractTeilegutachtenMarkingFromText(text)).toEqual({
      markingType: "Aufdruck auf den Federwindungen",
      markingNumber: "e1*47656",
    });
  });

  it("parses pipe-table Kennzeichnung rows", () => {
    const text = `
| Art der Kennzeichnung | Eingegossen |
| Nummer | 14-00123-CP-GBM |
`;

    expect(extractTeilegutachtenMarkingFromText(text)).toEqual({
      markingType: "Eingegossen",
      markingNumber: "14-00123-CP-GBM",
    });
  });

  it("falls back to single Kennzeichnung line", () => {
    const text = `
IV. Auflagen
1. Sichtprüfung

Kennzeichnung:
Aufdruck auf den Federwindungen
`;

    expect(extractTeilegutachtenMarkingFromText(text)).toEqual({
      markingType: "Aufdruck auf den Federwindungen",
      markingNumber: null,
    });
  });

  it("parses Kennzeichnungsnummer label", () => {
    const text = `
Kennzeichnung am Bauteil
Art der Kennzeichnung: Typenschild
Kennzeichnungsnummer: KBA 12345
`;

    expect(extractTeilegutachtenMarkingFromText(text)).toEqual({
      markingType: "Typenschild",
      markingNumber: "KBA 12345",
    });
  });
});

describe("extractMarkingFromTechnicalTable", () => {
  it("reads Art and Nummer rows from Technische Daten", () => {
    expect(
      extractMarkingFromTechnicalTable({
        caption: "Technische Daten",
        headers: ["Bezeichnung", "Wert"],
        rows: [
          {
            id: "r1",
            cells: ["Art der Kennzeichnung", "Prüfplakette"],
            isUserVehicleMatch: false,
            matchReason: null,
          },
          {
            id: "r2",
            cells: ["Nummer", "e1*99881"],
            isUserVehicleMatch: false,
            matchReason: null,
          },
        ],
      }),
    ).toEqual({
      markingType: "Prüfplakette",
      markingNumber: "e1*99881",
    });
  });
});

describe("normalizeTeilegutachtenMarking", () => {
  it("splits legacy physicalMarking with Art and Nummer", () => {
    expect(
      normalizeTeilegutachtenMarking({
        physicalMarking: "Art: Aufdruck · Nummer: e1*123",
      }),
    ).toEqual({
      markingType: "Aufdruck",
      markingNumber: "e1*123",
      physicalMarking: "Art: Aufdruck · Nummer: e1*123",
    });
  });
});

describe("mergeTeilegutachtenMarking", () => {
  it("fills missing LLM fields from heuristic OCR", () => {
    expect(
      mergeTeilegutachtenMarking(
        { markingType: "Aufdruck", markingNumber: null },
        { markingType: null, markingNumber: "e1*47656" },
      ),
    ).toEqual({
      markingType: "Aufdruck",
      markingNumber: "e1*47656",
    });
  });
});

describe("formatTeilegutachtenPhysicalMarking", () => {
  it("formats combined label", () => {
    expect(
      formatTeilegutachtenPhysicalMarking("Eingegossen", "14-00123"),
    ).toBe("Art: Eingegossen · Nummer: 14-00123");
  });
});
