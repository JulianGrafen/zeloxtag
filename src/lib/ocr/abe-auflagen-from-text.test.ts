import { describe, expect, it } from "vitest";

import {
  abeAuflagenConditionsFromNotes,
  isAbeCodeStructuredConditions,
  missingAuflagenCodesInNotes,
  parseAbeAuflagenNotes,
} from "@/lib/ocr/abe-auflagen-from-text";

describe("parseAbeAuflagenNotes", () => {
  it("splits OCR text by Auflagen code headings", () => {
    const parsed = parseAbeAuflagenNotes(
      `744: Montage nur an vorgesehenen Befestigungspunkten.

A02: Typprüfung erforderlich.

B04A: Kennzeichnung am Bauteil.`,
      ["744", "A02", "B04A"],
    );

    expect(parsed).toEqual([
      { code: "744", text: "Montage nur an vorgesehenen Befestigungspunkten." },
      { code: "A02", text: "Typprüfung erforderlich." },
      { code: "B04A", text: "Kennzeichnung am Bauteil." },
    ]);
  });

  it("builds conditions rows for document storage", () => {
    expect(
      abeAuflagenConditionsFromNotes("744: Nur mit Adapter.", ["744"]),
    ).toEqual(["744: Nur mit Adapter."]);
  });

  it("detects structured ABE conditions", () => {
    expect(
      isAbeCodeStructuredConditions([
        "744: Text",
        "A02: Mehr Text",
      ]),
    ).toBe(true);
    expect(isAbeCodeStructuredConditions(["744", "A02"])).toBe(false);
    expect(isAbeCodeStructuredConditions(["Freitext ohne Code"])).toBe(false);
  });

  it("splits by known codes when OCR has no colons", () => {
    const parsed = parseAbeAuflagenNotes(
      `744 Montage nur an vorgesehenen Punkten.

A02 Typprüfung erforderlich.`,
      ["744", "A02"],
    );
    expect(parsed).toHaveLength(2);
    expect(parsed[0]?.code).toBe("744");
    expect(parsed[1]?.code).toBe("A02");
  });

  it("reports missing target codes in OCR notes", () => {
    expect(
      missingAuflagenCodesInNotes("744: Nur mit Adapter.", ["744", "F40", "L04"]),
    ).toEqual(["F40", "L04"]);
    expect(
      missingAuflagenCodesInNotes(
        "744: Text\nF40: Mehr\nL04: Auch",
        ["744", "F40", "L04"],
      ),
    ).toEqual([]);
  });
});
