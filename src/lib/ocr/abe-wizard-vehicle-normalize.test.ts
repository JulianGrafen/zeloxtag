import { describe, expect, it } from "vitest";

import {
  looksLikeAuflagenCode,
  looksLikeFahrzeugtypCode,
  normalizeAbeVehicleMatches,
  parseAuflagenColumn,
} from "@/lib/ocr/abe-wizard-vehicle-normalize";
import type { AbeVehicleMatch } from "@/lib/validations/abeWizardSchemas";

describe("abe-wizard-vehicle-normalize", () => {
  it("detects Fahrzeugtyp codes", () => {
    expect(looksLikeFahrzeugtypCode("3k-N1")).toBe(true);
    expect(looksLikeFahrzeugtypCode("5L")).toBe(true);
    expect(looksLikeFahrzeugtypCode("530d")).toBe(false);
  });

  it("detects Auflagen codes", () => {
    expect(looksLikeAuflagenCode("744")).toBe(true);
    expect(looksLikeAuflagenCode("A77")).toBe(true);
    expect(looksLikeAuflagenCode("20B")).toBe(true);
    expect(looksLikeAuflagenCode("530d")).toBe(false);
  });

  it("splits model at the start of the Auflagen cell from following codes", () => {
    expect(
      parseAuflagenColumn([
        "530d Touring 744 A77 20B",
      ]).model,
    ).toBe("530d Touring");

    expect(
      parseAuflagenColumn(["530d Touring 744 A77 20B"]).codes,
    ).toEqual(["744", "A77", "20B"]);
  });

  it("keeps row-specific models from Auflagen instead of Fahrzeugtyp", () => {
    const input: AbeVehicleMatch[] = [
      {
        model: "3k-N1",
        typeApproval: "e1*2007/46*0508*0508*0000*00",
        driveType: "Heckantrieb",
        tireSizes: ["225/50R18"],
        auflagenCodes: ["520d 744 A77 20B"],
      },
      {
        model: "5L",
        typeApproval: "e1*2007/46*0508*0508*0000*00",
        driveType: "Allradantrieb",
        tireSizes: ["245/45R18"],
        auflagenCodes: ["530d xDrive 744 A77 20B"],
      },
    ];

    const normalized = normalizeAbeVehicleMatches(input);
    expect(normalized[0]?.model).toBe("520d");
    expect(normalized[0]?.auflagenCodes).toEqual(["744", "A77", "20B"]);
    expect(normalized[1]?.model).toBe("530d xDrive");
  });

  it("supports separate Auflagen tokens from the LLM", () => {
    const input: AbeVehicleMatch[] = [
      {
        model: "3k-N1",
        typeApproval: "e1*2007/46*0508*0508*0000*00",
        driveType: null,
        tireSizes: ["255/45R18"],
        auflagenCodes: ["530d", "744", "A77", "20B", "Allradantrieb"],
      },
    ];

    const normalized = normalizeAbeVehicleMatches(input);
    expect(normalized[0]?.model).toBe("530d");
    expect(normalized[0]?.driveType).toBe("Allradantrieb");
    expect(normalized[0]?.auflagenCodes).toEqual(["744", "A77", "20B"]);
  });
});
