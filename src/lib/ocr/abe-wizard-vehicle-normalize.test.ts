import { describe, expect, it } from "vitest";

import {
  looksLikeAuflagenCode,
  looksLikeFahrzeugtypCode,
  normalizeAbeVehicleMatches,
  parseAbeVehicleRows,
  parseAuflagenCodes,
  stripVerkaufsbezeichnungLabel,
} from "@/lib/ocr/abe-wizard-vehicle-normalize";
import type { AbeVehicleMatch } from "@/lib/validations/abeWizardSchemas";

describe("abe-wizard-vehicle-normalize", () => {
  it("detects Fahrzeugtyp codes", () => {
    expect(looksLikeFahrzeugtypCode("3k-N1")).toBe(true);
    expect(looksLikeFahrzeugtypCode("5ER REIHE")).toBe(false);
  });

  it("detects Auflagen codes", () => {
    expect(looksLikeAuflagenCode("744")).toBe(true);
    expect(looksLikeAuflagenCode("A77")).toBe(true);
    expect(looksLikeAuflagenCode("20B")).toBe(true);
    expect(looksLikeAuflagenCode("F40")).toBe(true);
    expect(looksLikeAuflagenCode("L04")).toBe(true);
    expect(looksLikeAuflagenCode("B04A")).toBe(true);
  });

  it("parses lowercase and punctuated Auflagen tokens", () => {
    expect(parseAuflagenCodes(["744, f40. L04"]).codes).toEqual([
      "744",
      "F40",
      "L04",
    ]);
  });

  it("promotes F40/L04 from Fahrzeugtyp to Auflagen when mis-assigned", () => {
    const normalized = normalizeAbeVehicleMatches([
      {
        verkaufsbezeichnung: "5ER REIHE",
        fahrzeugtyp: "F40",
        typeApproval: "e1*2007/46*0508*0508*0000*00",
        driveType: "Allradantrieb",
        tireSizes: ["245/45R18"],
        auflagenCodes: ["744"],
      },
      {
        verkaufsbezeichnung: "5ER REIHE",
        fahrzeugtyp: "L04",
        typeApproval: "e1*2007/46*0508*0508*0000*00",
        driveType: "Heckantrieb",
        tireSizes: ["225/50R18"],
        auflagenCodes: ["744"],
      },
    ]);

    expect(normalized[0]?.fahrzeugtyp).toBeNull();
    expect(normalized[0]?.auflagenCodes).toContain("F40");
    expect(normalized[1]?.auflagenCodes).toContain("L04");
    expect(normalized[1]?.fahrzeugtyp).toBeNull();
  });

  it("keeps short Fahrzeugtyp codes like 5L", () => {
    const normalized = normalizeAbeVehicleMatches([
      {
        verkaufsbezeichnung: "5ER REIHE",
        fahrzeugtyp: "5L",
        typeApproval: "e1*2007/46*0508*0508*0000*00",
        driveType: "Heckantrieb",
        tireSizes: ["225/50R18"],
        auflagenCodes: ["744"],
      },
    ]);

    expect(normalized[0]?.fahrzeugtyp).toBe("5L");
    expect(normalized[0]?.auflagenCodes).toEqual(["744"]);
  });

  it("parses Auflagen codes only", () => {
    expect(parseAuflagenCodes(["744 A77 20B Allradantrieb"]).codes).toEqual([
      "744",
      "A77",
      "20B",
    ]);
    expect(parseAuflagenCodes(["744 A77 Allradantrieb"]).driveType).toBe(
      "Allradantrieb",
    );
  });

  it("carries Verkaufsbezeichnung across rows in a group", () => {
    const input: AbeVehicleMatch[] = [
      {
        verkaufsbezeichnung: "Verkaufsbezeichnung: 5ER REIHE",
        fahrzeugtyp: "3k-N1",
        typeApproval: "e1*2007/46*0508*0508*0000*00",
        driveType: "Allradantrieb",
        tireSizes: ["245/45R18"],
        auflagenCodes: ["744", "A77"],
      },
      {
        verkaufsbezeichnung: "",
        fahrzeugtyp: "5L",
        typeApproval: "e1*2007/46*0508*0508*0000*00",
        driveType: "Heckantrieb",
        tireSizes: ["225/50R18"],
        auflagenCodes: ["744", "20B"],
      },
    ];

    const normalized = normalizeAbeVehicleMatches(input);
    expect(stripVerkaufsbezeichnungLabel(normalized[0]!.verkaufsbezeichnung)).toBe(
      "5ER REIHE",
    );
    expect(normalized[1]?.verkaufsbezeichnung).toBe("5ER REIHE");
  });

  it("parses raw LLM rows with legacy model field and empty continuation rows", () => {
    const parsed = parseAbeVehicleRows([
      {
        verkaufsbezeichnung: "5ER REIHE",
        fahrzeugtyp: "3k-N1",
        typeApproval: "e1*2007/46*0508*0508*0000*00",
        driveType: "Allradantrieb",
        tireSizes: ["245/45R18"],
        auflagenCodes: ["744", "A77"],
      },
      {
        verkaufsbezeichnung: "",
        model: "5ER REIHE",
        fahrzeugtyp: "5L",
        typeApproval: "e1*2007/46*0508*0508*0000*00",
        driveType: "Heckantrieb",
        tireSizes: ["225/50R18"],
        auflagenCodes: ["744", "20B"],
      },
    ]);

    expect(parsed.length).toBeGreaterThanOrEqual(2);
    expect(parsed.every((row) => row.verkaufsbezeichnung === "5ER REIHE")).toBe(
      true,
    );
  });

  it("uses fallback group when rows have table data but no header", () => {
    const parsed = parseAbeVehicleRows([
      {
        verkaufsbezeichnung: "",
        fahrzeugtyp: "3k-N1",
        typeApproval: "e1*2007/46*0508*0508*0000*00",
        driveType: "Allradantrieb",
        tireSizes: ["245/45R18"],
        auflagenCodes: ["744", "A77"],
      },
      {
        verkaufsbezeichnung: "",
        fahrzeugtyp: "5L",
        typeApproval: "e1*2007/46*0508*0508*0000*00",
        driveType: "Heckantrieb",
        tireSizes: ["225/50R18"],
        auflagenCodes: ["744", "20B"],
      },
    ]);

    expect(parsed).toHaveLength(2);
    expect(parsed.every((row) => row.verkaufsbezeichnung === "Fahrzeugtabelle")).toBe(
      true,
    );
  });
});
