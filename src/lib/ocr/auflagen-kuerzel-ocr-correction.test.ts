import { describe, expect, it } from "vitest";

import {
  auflagenKuerzelConfusionDistance,
  correctAuflagenKuerzelList,
  correctAuflagenKuerzelOcr,
} from "@/lib/ocr/auflagen-kuerzel-ocr-correction";

describe("auflagenKuerzelConfusionDistance", () => {
  it("scores common OCR letter and digit swaps as distance 1", () => {
    expect(auflagenKuerzelConfusionDistance("CPO", "CPE")).toBe(1);
    expect(auflagenKuerzelConfusionDistance("CPO", "CBO")).toBe(1);
    expect(auflagenKuerzelConfusionDistance("K3A", "K8A")).toBe(1);
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
});

describe("correctAuflagenKuerzelList", () => {
  it("corrects a full row list with shared context", () => {
    expect(
      correctAuflagenKuerzelList(["744", "CPO"], {
        rawContext: "744 und CPE laut ABE",
      }),
    ).toEqual(["744", "CPE"]);
  });
});
