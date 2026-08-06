import { describe, expect, it } from "vitest";

import {
  looksLikeVerwendungsbereichTableDump,
  sanitizeTeilegutachtenCompatibilityTable,
  vehicleApprovalsFromSanitizedTable,
} from "@/lib/validations/teilegutachten-compatibility-table";

describe("sanitizeTeilegutachtenCompatibilityTable", () => {
  it("keeps only Hersteller · Typ · Modell and forward-fills brand", () => {
    const sanitized = sanitizeTeilegutachtenCompatibilityTable({
      caption: "Verwendungsbereich",
      headers: [
        "Fahrzeughersteller",
        "Fahrzeug- typ",
        "Handels- bezeichnung",
        "Ausführungen",
        "Zul. Achslasten (v/h) in kg",
        "ABE-Nr.",
      ],
      rows: [
        {
          id: "row-1",
          cells: [
            "Rover (GB)",
            "HW",
            "Concerto",
            "alle, außer",
            "860 / 790*)",
            "F 340",
          ],
          isUserVehicleMatch: false,
          matchReason: null,
        },
        {
          id: "row-2",
          cells: [
            "[2055]",
            "XW",
            "Rover 214, 216, 414, 416, 200, 220",
            "Diesel und 100KW / 147KW",
            "*) s. IV.3.2.",
            "F 377",
          ],
          isUserVehicleMatch: false,
          matchReason: null,
        },
      ],
    });

    expect(sanitized?.headers).toEqual(["Hersteller", "Typ", "Modell"]);
    expect(sanitized?.rows).toHaveLength(2);
    expect(sanitized?.rows[0]?.cells).toEqual([
      "Rover (GB)",
      "HW",
      "Concerto",
    ]);
    expect(sanitized?.rows[1]?.cells[0]).toBe("Rover (GB)");
    expect(sanitized?.rows[1]?.cells[1]).toBe("XW");

    expect(vehicleApprovalsFromSanitizedTable(sanitized)).toEqual([
      "Rover (GB) · HW · Concerto",
      "Rover (GB) · XW · Rover 214, 216, 414, 416, 200, 220",
    ]);
  });

  it("does not treat Fahrzeugtyp header as Modell column", () => {
    const sanitized = sanitizeTeilegutachtenCompatibilityTable({
      caption: null,
      headers: ["Hersteller", "Modell", "Typ"],
      rows: [
        {
          id: "row-1",
          cells: ["Mazda", "RX-8", "SE3P"],
          isUserVehicleMatch: true,
          matchReason: null,
        },
      ],
    });

    expect(sanitized?.rows[0]?.cells).toEqual(["Mazda", "SE3P", "RX-8"]);
    expect(vehicleApprovalsFromSanitizedTable(sanitized)).toEqual([
      "Mazda · SE3P · RX-8",
    ]);
  });
});

describe("looksLikeVerwendungsbereichTableDump", () => {
  it("detects pipe table OCR dumps", () => {
    expect(
      looksLikeVerwendungsbereichTableDump(
        "I. Verwendungsbereich | Fahrzeughersteller | Fahrzeug- typ | Handels- bezeichnung",
      ),
    ).toBe(true);
    expect(looksLikeVerwendungsbereichTableDump("Mazda RX-8 (SE3P)")).toBe(
      false,
    );
  });
});
