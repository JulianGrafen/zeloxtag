import { describe, expect, it } from "vitest";

import {
  matchCompatibilityTable,
  normalizeMatchToken,
  tableMatchingService,
} from "@/services/ocr/TableMatchingService";
import type { TableData } from "@/lib/validations/abeSchema";

const SAMPLE_TABLE: TableData = {
  caption: "Verwendungsbereich",
  headers: ["Hersteller", "Modell", "Typ", "EG-BE", "Auflage"],
  rows: [
    {
      id: "row-1",
      cells: ["Audi", "A4", "8K", "e1*2007/46*0284", "A1"],
      isUserVehicleMatch: false,
      matchReason: null,
    },
    {
      id: "row-2",
      cells: ["VW", "Passat", "3C", "e1*2001/116*0307", "A2"],
      isUserVehicleMatch: false,
      matchReason: null,
    },
    {
      id: "row-3",
      cells: ["VW", "Golf", "1K", "e1*2001/116*0242", "A1"],
      isUserVehicleMatch: false,
      matchReason: null,
    },
  ],
};

describe("normalizeMatchToken", () => {
  it("lowercases and collapses whitespace", () => {
    expect(normalizeMatchToken("  VW  Passat ")).toBe("vw passat");
  });
});

describe("TableMatchingService", () => {
  it("flags the exact type + EG-BE row for the user vehicle", () => {
    const { table, matchedRowIds } = tableMatchingService.matchTable(
      SAMPLE_TABLE,
      {
        brand: "VW",
        model: "Passat",
        type: "3C",
        egBe: "e1*2001/116*0307",
      },
    );

    expect(matchedRowIds).toEqual(["row-2"]);
    expect(table.rows[1]?.isUserVehicleMatch).toBe(true);
    expect(table.rows[1]?.matchReason).toContain("Type 3C");
    expect(table.rows[1]?.matchReason).toContain("EG-BE");
    expect(table.rows[0]?.isUserVehicleMatch).toBe(false);
    expect(table.rows[2]?.isUserVehicleMatch).toBe(false);
  });

  it("clears match flags when vehicle context is missing", () => {
    const preMarked: TableData = {
      ...SAMPLE_TABLE,
      rows: SAMPLE_TABLE.rows.map((row, index) => ({
        ...row,
        isUserVehicleMatch: index === 1,
        matchReason: index === 1 ? "stale" : null,
      })),
    };

    const matched = matchCompatibilityTable(preMarked, null);
    expect(matched.rows.every((row) => row.isUserVehicleMatch === false)).toBe(
      true,
    );
    expect(matched.rows.every((row) => row.matchReason === null)).toBe(true);
  });

  it("matches from haystack when column headers are generic", () => {
    const loose: TableData = {
      headers: ["Fahrzeug", "Bemerkung"],
      rows: [
        {
          id: "a",
          cells: ["BMW 3er E90", "—"],
          isUserVehicleMatch: false,
        },
        {
          id: "b",
          cells: ["VW Passat 3C e1*2001/116*0307", "OK"],
          isUserVehicleMatch: false,
        },
      ],
    };

    const matched = matchCompatibilityTable(loose, {
      brand: "VW",
      model: "Passat",
      type: "3C",
    });

    expect(matched.rows.find((row) => row.id === "b")?.isUserVehicleMatch).toBe(
      true,
    );
  });
});
