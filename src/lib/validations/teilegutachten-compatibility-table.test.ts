import { describe, expect, it } from "vitest";

import {
  looksLikeVerwendungsbereichTableDump,
  mergeTeilegutachtenCompatibilityTables,
  sanitizeTeilegutachtenCompatibilityTable,
  vehicleApprovalsFromSanitizedTable,
} from "@/lib/validations/teilegutachten-compatibility-table";

describe("sanitizeTeilegutachtenCompatibilityTable", () => {
  it("preserves the Verwendungsbereich table 1:1 with all columns", () => {
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

    expect(sanitized?.headers).toEqual([
      "Fahrzeughersteller",
      "Fahrzeug- typ",
      "Handels- bezeichnung",
      "Ausführungen",
      "Zul. Achslasten (v/h) in kg",
      "ABE-Nr.",
    ]);
    expect(sanitized?.rows).toHaveLength(2);
    expect(sanitized?.rows[0]?.cells).toEqual([
      "Rover (GB)",
      "HW",
      "Concerto",
      "alle, außer",
      "860 / 790*)",
      "F 340",
    ]);
    expect(sanitized?.rows[1]?.cells[0]).toBe("[2055]");
    expect(sanitized?.rows[1]?.cells[4]).toBe("*) s. IV.3.2.");

    expect(vehicleApprovalsFromSanitizedTable(sanitized)).toEqual([
      "Rover (GB) · HW · Concerto",
      "Rover (GB) · XW · Rover 214, 216, 414, 416, 200, 220",
    ]);
  });

  it("builds compact vehicle labels without confusing Typ vs Modell", () => {
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

    expect(sanitized?.rows[0]?.cells).toEqual(["Mazda", "RX-8", "SE3P"]);
    expect(vehicleApprovalsFromSanitizedTable(sanitized)).toEqual([
      "Mazda · SE3P · RX-8",
    ]);
  });

  it("resolves OCR-split headers for BMW (D)", () => {
    const sanitized = sanitizeTeilegutachtenCompatibilityTable({
      caption: "Verwendungsbereich",
      headers: [
        "Fahrzeugher- steller",
        "Fahrzeug- typ",
        "Handels- bezeichnung",
        "ABE-Nr.",
      ],
      rows: [
        {
          id: "row-1",
          cells: ["BMW (D)", "GG", "320i", "F 120"],
          isUserVehicleMatch: false,
          matchReason: null,
        },
        {
          id: "row-2",
          cells: ["[2055]", "GG", "330d", "F 121"],
          isUserVehicleMatch: false,
          matchReason: null,
        },
      ],
    });

    expect(vehicleApprovalsFromSanitizedTable(sanitized)).toEqual([
      "BMW (D) · GG · 320i",
      "BMW (D) · GG · 330d",
    ]);
  });

  it("resolves OCR-split headers for VW and Mercedes", () => {
    const sanitized = sanitizeTeilegutachtenCompatibilityTable({
      caption: "Verwendungsbereich",
      headers: [
        "Fahrzeugher- steller",
        "Typschlüs- sel",
        "Handels- bezeichnung",
      ],
      rows: [
        {
          id: "row-1",
          cells: ["Volkswagen (D)", "5G", "Golf VII", "F 200"],
          isUserVehicleMatch: false,
          matchReason: null,
        },
        {
          id: "row-2",
          cells: ["Mercedes-Benz (D)", "W205", "C 200", "F 300"],
          isUserVehicleMatch: false,
          matchReason: null,
        },
      ],
    });

    expect(vehicleApprovalsFromSanitizedTable(sanitized)).toEqual([
      "Volkswagen (D) · 5G · Golf VII",
      "Mercedes-Benz (D) · W205 · C 200",
    ]);
  });

  it("uses positional fallback when headers are unrecognizable", () => {
    const sanitized = sanitizeTeilegutachtenCompatibilityTable({
      caption: "Verwendungsbereich",
      headers: ["Spalte A", "Spalte B", "Spalte C"],
      rows: [
        {
          id: "row-1",
          cells: ["Audi (D)", "8V", "A3 Sportback"],
          isUserVehicleMatch: false,
          matchReason: null,
        },
      ],
    });

    expect(vehicleApprovalsFromSanitizedTable(sanitized)).toEqual([
      "Audi (D) · 8V · A3 Sportback",
    ]);
  });
});

describe("mergeTeilegutachtenCompatibilityTables", () => {
  it("prefers the table with more rows and columns", () => {
    const sparse = sanitizeTeilegutachtenCompatibilityTable({
      caption: "Verwendungsbereich",
      headers: ["Hersteller", "Typ"],
      rows: [
        {
          id: "row-1",
          cells: ["BMW", "E90"],
          isUserVehicleMatch: false,
          matchReason: null,
        },
      ],
    });
    const rich = sanitizeTeilegutachtenCompatibilityTable({
      caption: "Verwendungsbereich",
      headers: ["Fahrzeughersteller", "Fahrzeug- typ", "Handels- bezeichnung"],
      rows: [
        {
          id: "row-1",
          cells: ["BMW (D)", "E90", "320i"],
          isUserVehicleMatch: false,
          matchReason: null,
        },
        {
          id: "row-2",
          cells: ["BMW (D)", "E91", "320d"],
          isUserVehicleMatch: false,
          matchReason: null,
        },
      ],
    });

    expect(mergeTeilegutachtenCompatibilityTables(sparse, rich)).toEqual(rich);
    expect(mergeTeilegutachtenCompatibilityTables(rich, sparse)).toEqual(rich);
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
