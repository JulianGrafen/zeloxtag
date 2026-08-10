import { describe, expect, it } from "vitest";

import {
  ABE_KBA_48571_EXPECTED_STAMMDATEN,
  ABE_KBA_48571_LLM_VEHICLE_ROWS,
} from "@/lib/ocr/__fixtures__/abe-kba-48571-interpneu";
import {
  looksLikeFahrzeugtypCode,
  parseAbeVehicleRows,
} from "@/lib/ocr/abe-wizard-vehicle-normalize";
import {
  fillAbeDataHunterReport,
  isAbeCoreHuntComplete,
  missingAbeCoreHuntFields,
} from "@/lib/validations/abeDataHunterSchemas";

describe("ABE KBA 48571 Interpneu / TAM3325-8017 fixture", () => {
  it("recognizes Gutachten Fahrzeugtyp codes", () => {
    expect(looksLikeFahrzeugtypCode("346K")).toBe(true);
    expect(looksLikeFahrzeugtypCode("346L")).toBe(true);
    expect(looksLikeFahrzeugtypCode("3/CG")).toBe(true);
    expect(looksLikeFahrzeugtypCode("BMW 3er-Reihe")).toBe(false);
  });

  it("parses Handelsbezeichnung rows from simulated hunt-all output", () => {
    const parsed = parseAbeVehicleRows([...ABE_KBA_48571_LLM_VEHICLE_ROWS]);

    expect(parsed.length).toBeGreaterThanOrEqual(3);
    expect(parsed.some((row) => /3er-Compact/i.test(row.verkaufsbezeichnung))).toBe(
      true,
    );
    expect(parsed.some((row) => /3er-Reihe/i.test(row.verkaufsbezeichnung))).toBe(
      true,
    );

    const compactRow = parsed.find((row) => row.fahrzeugtyp === "346K");
    expect(compactRow?.typeApproval).toMatch(/e1\*98\/14\*0167/i);
    expect(compactRow?.tireSizes).toContain("215/45R17");
    expect(compactRow?.auflagenCodes).toContain("A01");

    const cgRow = parsed.find((row) => row.fahrzeugtyp === "3/CG");
    expect(cgRow?.auflagenCodes).toContain("L02");
  });

  it("completes core hunt after merging stammdaten + vehicle table", () => {
    const merged = fillAbeDataHunterReport(
      {
        kbaNumber: ABE_KBA_48571_EXPECTED_STAMMDATEN.kbaNumber,
        abeNumber: ABE_KBA_48571_EXPECTED_STAMMDATEN.abeNumber,
        abeHolder: "Interpneu Handelsgesellschaft mbH",
        manufacturer: "Interpneu Handelsgesellschaft mbH",
        partDesignation:
          "PKW-Sonderrad 8Jx17EH2+ Typ TAM3325-8017",
        markingText: null,
        vehicleMatches: parseAbeVehicleRows([...ABE_KBA_48571_LLM_VEHICLE_ROWS]),
        auflagenCodes: [],
        auflagenNotes: null,
      },
      {
        kbaNumber: null,
        abeNumber: null,
        abeHolder: null,
        manufacturer: null,
        partDesignation: null,
        markingText: null,
        vehicleMatches: [],
        auflagenCodes: [],
        auflagenNotes: null,
      },
    );

    expect(merged.partDesignation).toMatch(
      ABE_KBA_48571_EXPECTED_STAMMDATEN.partDesignation,
    );
    expect(missingAbeCoreHuntFields(merged)).not.toContain("verkaufsbezeichnung");
    expect(isAbeCoreHuntComplete(merged)).toBe(true);
  });
});
