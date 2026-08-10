import { describe, expect, it } from "vitest";

import {
  augmentAuflagenNotesWithKuerzelDb,
  auflagenCodesMissingAfterKuerzelDb,
  extractKuerzelRecordsFromOcrNotes,
  mergeAuflagenKuerzelMaps,
  selectKuerzelRecordsToLearn,
} from "@/lib/ocr/auflagen-kuerzel-db";

describe("auflagen-kuerzel-db", () => {
  const db = mergeAuflagenKuerzelMaps([
    { kuerzel: "744", text: "Montage nur an vorgesehenen Befestigungspunkten." },
    { kuerzel: "A02", text: "Typprüfung erforderlich." },
  ]);

  it("fills missing target codes from the lookup table", () => {
    expect(
      augmentAuflagenNotesWithKuerzelDb(null, ["744", "A02"], db),
    ).toBe(
      "744: Montage nur an vorgesehenen Befestigungspunkten.\n\nA02: Typprüfung erforderlich.",
    );
  });

  it("keeps existing OCR notes and only adds missing codes", () => {
    expect(
      augmentAuflagenNotesWithKuerzelDb("744: Bereits gescannt.", ["744", "A02"], db),
    ).toBe("744: Bereits gescannt.\n\nA02: Typprüfung erforderlich.");
  });

  it("reports no missing codes after DB augmentation", () => {
    expect(auflagenCodesMissingAfterKuerzelDb(["744", "A02"], db, null)).toEqual(
      [],
    );
  });

  it("extracts learnable records from OCR notes", () => {
    expect(
      extractKuerzelRecordsFromOcrNotes("F40: Neue Auflage aus dem Scan.", ["F40"]),
    ).toEqual([{ kuerzel: "F40", text: "Neue Auflage aus dem Scan." }]);
  });

  it("selects only new or longer texts for persistence", () => {
    expect(
      selectKuerzelRecordsToLearn(
        [{ kuerzel: "744", text: "Kurz." }, { kuerzel: "F40", text: "Brandneue Auflage aus OCR Scan." }],
        db,
      ),
    ).toEqual([{ kuerzel: "F40", text: "Brandneue Auflage aus OCR Scan." }]);
  });
});
