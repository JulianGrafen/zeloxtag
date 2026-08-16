import { describe, expect, it } from "vitest";

import {
  augmentAuflagenNotesWithKuerzelDb,
  auflagenCodesMissingAfterKuerzelDb,
  auflagenKuerzelImageSrc,
  auflagenKuerzelStorageObjectPath,
  extractKuerzelRecordsFromOcrNotes,
  mergeAuflagenKuerzelMaps,
  resolveAuflagenWithKuerzelDb,
  resolveDisplayAuflagenImageUrl,
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

  it("resolves all target codes when every kuerzel is in the db", () => {
    const resolved = resolveAuflagenWithKuerzelDb(null, ["744", "A02"], db);
    expect(resolved.allResolved).toBe(true);
    expect(resolved.missingCodes).toEqual([]);
    expect(resolved.dbFilledCodes).toEqual(["744", "A02"]);
    expect(resolved.notes).toContain("744:");
    expect(resolved.notes).toContain("A02:");
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

describe("auflagen kuerzel image display", () => {
  it("keeps a live blob preview and otherwise uses the same-origin proxy", () => {
    expect(
      resolveDisplayAuflagenImageUrl("744", "blob:https://local/preview"),
    ).toBe("blob:https://local/preview");
    expect(
      resolveDisplayAuflagenImageUrl(
        "744",
        "https://example.supabase.co/storage/v1/object/public/abe-auflagen-kuerzel/744.jpg",
      ),
    ).toBe(auflagenKuerzelImageSrc("744"));
    expect(resolveDisplayAuflagenImageUrl("744")).toBe(
      auflagenKuerzelImageSrc("744"),
    );
  });

  it("extracts a storage object key from public URLs and bucket prefixes", () => {
    expect(
      auflagenKuerzelStorageObjectPath(
        "https://example.supabase.co/storage/v1/object/public/abe-auflagen-kuerzel/744.jpg",
        "abe-auflagen-kuerzel",
      ),
    ).toBe("744.jpg");
    expect(
      auflagenKuerzelStorageObjectPath(
        "abe-auflagen-kuerzel/A02.png",
        "abe-auflagen-kuerzel",
      ),
    ).toBe("A02.png");
    expect(
      auflagenKuerzelStorageObjectPath("F40.webp", "abe-auflagen-kuerzel"),
    ).toBe("F40.webp");
  });
});
