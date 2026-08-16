import { describe, expect, it } from "vitest";

import {
  auflagenKuerzelConfusionDistance,
  correctAuflagenKuerzelList,
  correctAuflagenKuerzelOcr,
  repairNumericAuflagenLetterSuffix,
} from "@/lib/ocr/auflagen-kuerzel-ocr-correction";

describe("auflagenKuerzelConfusionDistance", () => {
  it("scores common OCR letter and digit swaps as distance 1", () => {
    expect(auflagenKuerzelConfusionDistance("CPO", "CPE")).toBe(1);
    expect(auflagenKuerzelConfusionDistance("CPO", "CBO")).toBe(1);
    expect(auflagenKuerzelConfusionDistance("K3A", "K8A")).toBe(1);
    expect(auflagenKuerzelConfusionDistance("228", "22B")).toBe(1);
  });
});

describe("repairNumericAuflagenLetterSuffix", () => {
  it("maps 228 to 22B and 118 to dictionary 11B", () => {
    expect(repairNumericAuflagenLetterSuffix("228")).toBe("22B");
    expect(repairNumericAuflagenLetterSuffix("118")).toBe("11B");
    expect(repairNumericAuflagenLetterSuffix("208")).toBe("20B");
  });

  it("keeps known numeric codes such as 248", () => {
    expect(repairNumericAuflagenLetterSuffix("248")).toBe("248");
    expect(repairNumericAuflagenLetterSuffix("166")).toBe("166");
  });
});

describe("correctAuflagenKuerzelOcr", () => {
  it("maps phantom CPO to CPE when allowlist contains CPE", () => {
    expect(
      correctAuflagenKuerzelOcr("CPO", {
        allowlist: ["744", "CPE"],
      }),
    ).toBe("CPE");
  });

  it("maps phantom CPO to CBO when allowlist contains CBO", () => {
    expect(
      correctAuflagenKuerzelOcr("CPO", {
        allowlist: ["744", "CBO"],
      }),
    ).toBe("CBO");
  });

  it("uses raw context to disambiguate CPE vs CBO", () => {
    expect(
      correctAuflagenKuerzelOcr("CPO", {
        allowlist: ["CPO"],
        rawContext: "744: Text\nCBO: Montagehinweis",
      }),
    ).toBe("CBO");
  });

  it("keeps valid codes unchanged", () => {
    expect(correctAuflagenKuerzelOcr("744", { allowlist: ["744", "CPE"] })).toBe(
      "744",
    );
    expect(correctAuflagenKuerzelOcr("CPE", { allowlist: ["CPE"] })).toBe("CPE");
  });

  it("maps OCR digit O misread 760 to dictionary 76O", () => {
    expect(auflagenKuerzelConfusionDistance("760", "76O")).toBe(1);
    expect(
      correctAuflagenKuerzelOcr("760", {
        allowlist: ["760", "744"],
      }),
    ).toBe("76O");
  });

  it("maps OCR 228 to 22B", () => {
    expect(correctAuflagenKuerzelOcr("228")).toBe("22B");
  });
});

describe("correctAuflagenKuerzelList", () => {
  it("corrects a full row list with shared context", () => {
    expect(
      correctAuflagenKuerzelList(["744", "CPO"], {
        rawContext: "744 und CPE laut ABE",
      }),
    ).toEqual(["744", "CPE"]);
  });

  it("repairs 228 in a row list without collapsing 248", () => {
    expect(correctAuflagenKuerzelList(["11A", "228", "248", "744"])).toEqual([
      "11A",
      "22B",
      "248",
      "744",
    ]);
  });
});
