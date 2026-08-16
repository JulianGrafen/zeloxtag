import { describe, expect, it } from "vitest";

import {
  abeAuflagenConditionsFromNotes,
  attributeAuflagenScanNotes,
  isAbeCodeStructuredConditions,
  missingAuflagenCodesInNotes,
  parseAbeAuflagenNotes,
  sanitizeAuflagenNotesForTargetCodes,
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

  it("ignores phantom codes in strict mode", () => {
    const parsed = parseAbeAuflagenNotes(
      `744: Gültiger Text.

K40: Fahrzeugtyp-Bleed.

A02: Typprüfung.`,
      ["744", "A02"],
      { strict: true },
    );

    expect(parsed.map((entry) => entry.code)).toEqual(["744", "A02"]);
  });

  it("sanitizes OCR notes to target codes only", () => {
    expect(
      sanitizeAuflagenNotesForTargetCodes(
        "744: Text\nK40: Phantom\nA02: Mehr",
        ["744", "A02"],
      ),
    ).toBe("744: Text\n\nA02: Mehr");
  });

  it("corrects phantom CPO to CPE when parsing notes", () => {
    const parsed = parseAbeAuflagenNotes(
      "CPO: Montage nur mit Adapter.",
      ["744", "CPE"],
      { strict: true },
    );
    expect(parsed).toEqual([
      { code: "CPE", text: "Montage nur mit Adapter." },
    ]);
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

  it("keeps large German prose under the printed code instead of splitting on Die/Wird", () => {
    const parsed = parseAbeAuflagenNotes(
      `744
Die Verwendung von Sonderrädern ist nur an den im Verwendungsbereich aufgeführten Fahrzeugen zulässig.

1. Die mindestens erforderlichen Anzugsmomente der Befestigungselemente sind einzuhalten.
2. Wird das serienmäßige Ersatzrad verwendet, soll mit mäßiger Geschwindigkeit gefahren werden.`,
      ["744", "F40"],
      { strict: true },
    );

    expect(parsed).toHaveLength(1);
    expect(parsed[0]?.code).toBe("744");
    expect(parsed[0]?.text).toContain("Die Verwendung von Sonderrädern");
    expect(parsed[0]?.text).toContain("1. Die mindestens erforderlichen");
    expect(parsed[0]?.text).toContain("2. Wird das serienmäßige Ersatzrad");
  });

  it("attributes a large unprefixed Auflagen block to the current scan code", () => {
    const notes = attributeAuflagenScanNotes(
      "Die mindestens erforderlichen Geschwindigkeitsbereiche der zu verwendenden Reifen sind unter Berücksichtigung der Loadindexe den Fahrzeugpapieren zu entnehmen.",
      ["744", "F40", "L04"],
    );

    expect(notes).toMatch(/^744:/);
    expect(notes).toContain("Geschwindigkeitsbereiche");
    expect(missingAuflagenCodesInNotes(notes, ["744", "F40", "L04"])).toEqual([
      "F40",
      "L04",
    ]);
  });

  it("attributes preamble prose before a later CODE block to the first missing Kürzel", () => {
    const notes = attributeAuflagenScanNotes(
      `Die Verwendung von Schneeketten ist nicht möglich.

A02: Typprüfung erforderlich.`,
      ["744", "A02"],
    );

    expect(notes).toContain("744: Die Verwendung von Schneeketten");
    expect(notes).toContain("A02: Typprüfung erforderlich.");
    expect(missingAuflagenCodesInNotes(notes, ["744", "A02"])).toEqual([]);
  });
});
