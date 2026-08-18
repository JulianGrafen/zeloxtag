import { describe, expect, it } from "vitest";

import {
  ABE_KBA_48571_EXPECTED_STAMMDATEN,
  ABE_KBA_48571_LLM_VEHICLE_ROWS,
  ABE_KBA_48571_NOISY_LLM_ROWS,
} from "@/lib/ocr/__fixtures__/abe-kba-48571-interpneu";
import {
  looksLikeFahrzeugtypCode,
  parseAbeVehicleRows,
} from "@/lib/ocr/abe-wizard-vehicle-normalize";
import {
  coalesceAbeHolderAndManufacturer,
  fillAbeDataHunterReport,
  isAbeCoreHuntComplete,
  missingAbeCoreHuntFields,
  sanitizeAbePartyName,
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

    expect(parsed.length).toBeGreaterThanOrEqual(4);
    expect(parsed.some((row) => /3er-Compact/i.test(row.verkaufsbezeichnung))).toBe(
      true,
    );
    expect(parsed.some((row) => /3er-Reihe/i.test(row.verkaufsbezeichnung))).toBe(
      true,
    );

    const compactRow = parsed.find((row) => row.fahrzeugtyp === "346K");
    expect(compactRow?.typeApproval).toMatch(/e1\*98\/14\*0167/i);
    expect(compactRow?.tireSizes).toEqual(
      expect.arrayContaining(["215/45 R17", "225/45 R17"]),
    );
    expect(compactRow?.tireSizes).toHaveLength(2);
    expect(compactRow?.auflagenCodes).toContain("A01");

    const cgRow = parsed.find((row) => row.fahrzeugtyp === "3/CG");
    expect(cgRow?.auflagenCodes).toContain("L02");

    expect(parsed.some((row) => row.fahrzeugtyp === "346C")).toBe(true);
    expect(parsed.some((row) => row.fahrzeugtyp === "346R")).toBe(true);
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

  it("fixes common Handelgesellschaft OCR typo in party names", () => {
    expect(
      sanitizeAbePartyName("Interpneu Handelgesellschaft mbH"),
    ).toBe("Interpneu Handelsgesellschaft mbH");
    expect(
      coalesceAbeHolderAndManufacturer({
        kbaNumber: null,
        abeNumber: null,
        abeHolder: "Interpneu Handelgesellschaft mbH",
        manufacturer: null,
        partDesignation: null,
        markingText: null,
        vehicleMatches: [],
        auflagenCodes: [],
        auflagenNotes: null,
      }).manufacturer,
    ).toBe("Interpneu Handelsgesellschaft mbH");
  });

  it("filters noisy hunt-all rows without Fahrzeugtyp and phantom Kürzel", () => {
    const parsed = parseAbeVehicleRows([...ABE_KBA_48571_NOISY_LLM_ROWS]);

    expect(parsed.every((row) => row.fahrzeugtyp?.trim())).toBe(true);
    expect(parsed.some((row) => row.fahrzeugtyp === "346K")).toBe(true);
    expect(parsed.some((row) => row.fahrzeugtyp === "3/CG")).toBe(true);
    expect(parsed.some((row) => /1er-Reihe/i.test(row.verkaufsbezeichnung))).toBe(
      false,
    );

    const compact = parsed.find((row) => row.fahrzeugtyp === "346K");
    expect(compact?.auflagenCodes).toEqual(
      expect.arrayContaining(["K2B", "K41", "A01", "A02", "A04", "S01"]),
    );
    expect(compact?.auflagenCodes).not.toContain("K7C");
  });
});
