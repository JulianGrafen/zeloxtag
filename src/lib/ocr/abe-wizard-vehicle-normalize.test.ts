import { describe, expect, it } from "vitest";

import {
  looksLikeFahrzeugtypCode,
  looksLikeVerkaufsbezeichnung,
  normalizeAbeVehicleMatches,
} from "@/lib/ocr/abe-wizard-vehicle-normalize";
import type { AbeVehicleMatch } from "@/lib/validations/abeWizardSchemas";

describe("abe-wizard-vehicle-normalize", () => {
  it("detects Fahrzeugtyp codes", () => {
    expect(looksLikeFahrzeugtypCode("3k-N1")).toBe(true);
    expect(looksLikeFahrzeugtypCode("5L")).toBe(true);
    expect(looksLikeFahrzeugtypCode("K-N1")).toBe(true);
    expect(looksLikeFahrzeugtypCode("5ER REIHE")).toBe(false);
  });

  it("detects Verkaufsbezeichnung labels", () => {
    expect(looksLikeVerkaufsbezeichnung("5ER REIHE")).toBe(true);
    expect(looksLikeVerkaufsbezeichnung("Nur BMW 5er Touring")).toBe(true);
    expect(looksLikeVerkaufsbezeichnung("10B")).toBe(false);
  });

  it("replaces Fahrzeugtyp with group header from previous row", () => {
    const input: AbeVehicleMatch[] = [
      {
        model: "5ER REIHE",
        typeApproval: "e1*2007/46*0508*0508*0000*00",
        driveType: "Allradantrieb",
        tireSizes: ["245/45R18"],
        auflagenCodes: ["10B"],
      },
      {
        model: "3k-N1",
        typeApproval: "e1*2007/46*0508*0508*0000*00",
        driveType: "Heckantrieb",
        tireSizes: ["225/50R18"],
        auflagenCodes: ["11B", "4DA"],
      },
    ];

    const normalized = normalizeAbeVehicleMatches(input);
    expect(normalized[1]?.model).toBe("5ER REIHE");
  });

  it("pulls Verkaufsbezeichnung from Auflagen text notes", () => {
    const input: AbeVehicleMatch[] = [
      {
        model: "5L",
        typeApproval: "e1*2007/46*0508*0508*0000*00",
        driveType: "Heckantrieb",
        tireSizes: ["225/50R18"],
        auflagenCodes: ["Nur BMW 5er Touring", "11B"],
      },
    ];

    const normalized = normalizeAbeVehicleMatches(input);
    expect(normalized[0]?.model).toBe("BMW 5er Touring");
    expect(normalized[0]?.auflagenCodes).toEqual(["11B"]);
  });
});
