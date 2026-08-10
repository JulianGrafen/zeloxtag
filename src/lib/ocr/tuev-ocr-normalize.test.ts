import { describe, expect, it } from "vitest";

import { normalizeTuevOcrText } from "@/lib/ocr/tuev-ocr-normalize";

describe("normalizeTuevOcrText", () => {
  it("normalizes spaced field markers and km label", () => {
    const raw = "( 3 ) Prüf ort Mechernich, 23.03.2021\n( 4 ) km - St.\n178 605";
    expect(normalizeTuevOcrText(raw)).toContain("(3) Prüfort Mechernich");
    expect(normalizeTuevOcrText(raw)).toContain("km-St.");
  });

  it("joins split checkpoint numbers", () => {
    expect(normalizeTuevOcrText("1 . 1.13a ( EM ) Bremsbelag")).toBe(
      "1.1.13a (EM) Bremsbelag",
    );
  });
});
