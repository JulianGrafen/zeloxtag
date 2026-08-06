import { describe, expect, it } from "vitest";

import {
  sanitizeTeilegutachtenTechnicalTable,
  technicalSpecsFromTeilegutachtenTable,
} from "@/lib/validations/teilegutachten-technical-data";
import {
  normalizeTeilegutachtenExtraction,
  teilegutachtenTechnicalSpecs,
  teilegutachtenToApprovalFields,
} from "@/lib/validations/teilegutachtenSchema";

describe("sanitizeTeilegutachtenTechnicalTable", () => {
  it("preserves full technical cell text in table form", () => {
    const longValue =
      "Aufdruck auf den Windungen (Achse 1: 29 827 VA; Achse 2: 29 827 HA) gemäß Herstellerangabe ohne Kürzung.";

    const table = sanitizeTeilegutachtenTechnicalTable({
      caption: "II. Technische Daten",
      headers: ["Bezeichnung", "Angabe"],
      rows: [
        {
          id: "t1",
          cells: ["Kennzeichnung am Bauteil", longValue],
          isUserVehicleMatch: false,
          matchReason: null,
        },
        {
          id: "t2",
          cells: ["Federrate Achse 1", "45 N/mm"],
          isUserVehicleMatch: false,
          matchReason: null,
        },
      ],
    });

    expect(table?.rows[0]?.cells[1]).toBe(longValue);
    expect(technicalSpecsFromTeilegutachtenTable(table)).toEqual([
      { label: "Kennzeichnung am Bauteil", value: longValue },
      { label: "Federrate Achse 1", value: "45 N/mm" },
    ]);
  });
});

describe("teilegutachtenTechnicalSpecs", () => {
  it("stores technicalDataTable on approval_fields", () => {
    const extracted = normalizeTeilegutachtenExtraction({
      documentType: "Teilegutachten",
      certificateNumber: "TG-TECH-1",
      manufacturer: "Eibach",
      partCategory: "Federn",
      partType: "21-85-041",
      physicalMarking: "Aufdruck",
      requiresPhysicalInspection: true,
      testingOrganization: "TÜV",
      userVehicleMatchStatus: null,
      verwendungsbereich: null,
      auflagen: null,
      matchedVehicleRow: null,
      compatibilityTable: null,
      technicalDataTable: {
        caption: "Technische Daten",
        headers: ["Achse", "Federrate", "Länge"],
        rows: [
          {
            id: "r1",
            cells: ["VA", "45 N/mm", "320 mm"],
            isUserVehicleMatch: false,
            matchReason: null,
          },
        ],
      },
    });

    const approval = teilegutachtenToApprovalFields(extracted);
    expect(approval.data.technicalDataTable?.headers).toEqual([
      "Achse",
      "Federrate",
      "Länge",
    ]);
    expect(teilegutachtenTechnicalSpecs(extracted)).toEqual([
      { label: "VA", value: "45 N/mm · 320 mm" },
    ]);
  });
});
