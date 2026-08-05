import { describe, expect, it } from "vitest";

import {
  ABE_CONTEXT_MAX_PAGES,
  ABE_COVER_MAX_PAGES,
  buildAbeSystemPrompt,
  coverTextFromPageBlocks,
  truncateAbeCoverPages,
} from "@/services/ocr/AbeExtractionService";
import {
  normalizeAbeKbaDigits,
  normalizeAbeMinimal,
} from "@/lib/validations/abeSchema";

describe("ABE cover truncation", () => {
  it("keeps only the first two marked pages", () => {
    const text = [
      "--- Seite 1 ---",
      "KBA 39577",
      "Hersteller: MS Design",
      "--- Seite 2 ---",
      "Prüforganisation: TÜV SÜD",
      "--- Seite 3 ---",
      "Verwendungsbereich: lange Tabelle …",
      "--- Seite 4 ---",
      "Auflagen: …",
    ].join("\n");

    const cover = truncateAbeCoverPages(text, ABE_COVER_MAX_PAGES);
    expect(cover).toContain("KBA 39577");
    expect(cover).toContain("TÜV SÜD");
    expect(cover).not.toContain("Verwendungsbereich");
    expect(cover).not.toContain("Auflagen");
  });

  it("keeps Verwendungsbereich pages when context window is used", () => {
    const text = [
      "--- Seite 1 ---",
      "KBA 39577",
      "--- Seite 2 ---",
      "Prüforganisation",
      "--- Seite 3 ---",
      "Verwendungsbereich: VW Passat 3C",
      "--- Seite 4 ---",
      "Auflage A1",
    ].join("\n");

    const window = truncateAbeCoverPages(text, ABE_CONTEXT_MAX_PAGES, 40_000);
    expect(window).toContain("Verwendungsbereich: VW Passat 3C");
    expect(window).toContain("Auflage A1");
  });

  it("builds cover text from page line blocks", () => {
    const cover = coverTextFromPageBlocks(
      ["Hersteller MS Design\nKBA 39577", "Seite 2 Inhalt", "Seite 3 verwerfen"],
      2,
    );
    expect(cover).toContain("MS Design");
    expect(cover).toContain("Seite 2 Inhalt");
    expect(cover).not.toContain("verwerfen");
  });
});

describe("buildAbeSystemPrompt", () => {
  it("skips vehicle check when no context is provided", () => {
    const prompt = buildAbeSystemPrompt(null);
    expect(prompt).toContain("no target vehicle was provided");
    expect(prompt).not.toContain("TARGET VEHICLE CHECK");
  });

  it("injects brand/model and match instructions when context is set", () => {
    const prompt = buildAbeSystemPrompt({
      brand: "VW",
      model: "Passat",
      type: "3C",
      egBe: "e1*2001/116*0307",
    });
    expect(prompt).toContain("TARGET VEHICLE CHECK");
    expect(prompt).toContain("VW Passat (3C)");
    expect(prompt).toContain("EG-BE: e1*2001/116*0307");
    expect(prompt).toContain("userVehicleMatchStatus");
    expect(prompt).toContain("matchedVehicleRow");
    expect(prompt).toContain("matchedConditions");
  });
});

describe("AbeMinimal normalize", () => {
  it("strips KBA prefix to digits", () => {
    expect(normalizeAbeKbaDigits("KBA 39577")).toBe("39577");
    expect(normalizeAbeKbaDigits("39577")).toBe("39577");
  });

  it("normalizes a full minimal payload", () => {
    expect(
      normalizeAbeMinimal({
        kbaNumber: "KBA 39577",
        testingOrganization: " TÜV SÜD Automotive GmbH ",
        manufacturer: "MS Design",
        partCategory: "Frontspoiler",
        partType: "3C5 071 609",
        userVehicleMatchStatus: null,
        matchedConditions: null,
        matchedVehicleRow: null,
        compatibilityTable: null,
      }),
    ).toEqual({
      kbaNumber: "39577",
      testingOrganization: "TÜV SÜD Automotive GmbH",
      manufacturer: "MS Design",
      partCategory: "Frontspoiler",
      partType: "3C5 071 609",
      userVehicleMatchStatus: null,
      matchedConditions: null,
      matchedVehicleRow: null,
      compatibilityTable: null,
    });
  });

  it("keeps match row/conditions only when status is verified", () => {
    expect(
      normalizeAbeMinimal({
        kbaNumber: "39577",
        testingOrganization: "TÜV",
        manufacturer: "MS Design",
        partCategory: "Frontspoiler",
        partType: "X",
        userVehicleMatchStatus: "verified",
        matchedConditions: ["  Auflage A1  ", ""],
        matchedVehicleRow: " VW Passat 3C ",
      }),
    ).toMatchObject({
      userVehicleMatchStatus: "verified",
      matchedConditions: ["Auflage A1"],
      matchedVehicleRow: "VW Passat 3C",
    });

    expect(
      normalizeAbeMinimal({
        kbaNumber: "39577",
        testingOrganization: "TÜV",
        manufacturer: "MS Design",
        partCategory: "Frontspoiler",
        partType: "X",
        userVehicleMatchStatus: "not_found",
        matchedConditions: ["should drop"],
        matchedVehicleRow: "should drop",
        compatibilityTable: null,
      }),
    ).toMatchObject({
      userVehicleMatchStatus: "not_found",
      matchedConditions: null,
      matchedVehicleRow: null,
      compatibilityTable: null,
    });
  });
});
