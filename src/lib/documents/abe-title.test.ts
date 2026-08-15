import { describe, expect, it } from "vitest";

import {
  abePartArtLabel,
  displayAbeDocumentTitle,
  extractAbeModelFromDesignation,
  titleFromAbeFields,
} from "./abe-title";

describe("titleFromAbeFields", () => {
  it("uses manufacturer + model as the title", () => {
    expect(
      titleFromAbeFields({ manufacturer: "Keskin", partType: "KT15" }),
    ).toBe("Keskin KT15");
  });

  it("appends the part kind when present", () => {
    expect(
      titleFromAbeFields({
        manufacturer: "Keskin",
        partType: "KT15",
        partCategory: "Felge",
      }),
    ).toBe("Keskin KT15 · Felge");
  });

  it("does not duplicate the brand when the model already includes it", () => {
    expect(
      titleFromAbeFields({
        manufacturer: "Keskin",
        partType: "Keskin KT15",
        partCategory: "Räder",
      }),
    ).toBe("Keskin KT15 · Felge");
  });

  it("maps wheel categories to Felge", () => {
    expect(abePartArtLabel("Leichtmetallfelge")).toBe("Felge");
    expect(abePartArtLabel("Räder")).toBe("Felge");
    expect(abePartArtLabel("wheels")).toBe("Felge");
  });

  it("ignores KBA numbers and generic categories as art", () => {
    expect(abePartArtLabel("KBA 48571")).toBeNull();
    expect(abePartArtLabel("Sonstiges")).toBeNull();
    expect(
      titleFromAbeFields({
        manufacturer: "BBS",
        partType: "Superleggera",
        partCategory: "KBA 39577",
      }),
    ).toBe("BBS Superleggera");
  });

  it("treats an art-only partType as the kind, not the model", () => {
    expect(
      titleFromAbeFields({
        manufacturer: "Keskin",
        partType: "Felge",
      }),
    ).toBe("Keskin · Felge");
  });

  it("falls back to art or ABE when no model exists", () => {
    expect(titleFromAbeFields({ partCategory: "Fahrwerk" })).toBe("Fahrwerk");
    expect(titleFromAbeFields({})).toBe("ABE");
  });
});

describe("extractAbeModelFromDesignation", () => {
  it("reads Typ tokens from long designations", () => {
    expect(
      extractAbeModelFromDesignation("Sonderräder 8 J x 18 H2 Typ AVAG"),
    ).toBe("AVAG");
  });

  it("returns null for art-only designations", () => {
    expect(extractAbeModelFromDesignation("Leichtmetallfelge")).toBeNull();
    expect(extractAbeModelFromDesignation("Leichtmetallfelge 8,5 × 19")).toBeNull();
  });
});

describe("displayAbeDocumentTitle", () => {
  it("rebuilds the title from stored manufacturer, vendor and category", () => {
    expect(
      displayAbeDocumentTitle({
        title: "Leichtmetallfelge · Keskin",
        type: "abe",
        manufacturer: "Keskin",
        vendor: "KT15",
        part_category: "Felge",
      }),
    ).toBe("Keskin KT15 · Felge");
  });

  it("keeps Einzelabnahme titles unchanged", () => {
    expect(
      displayAbeDocumentTitle({
        title: "Einzelabnahme BMW 3er",
        type: "abe",
        manufacturer: "BMW",
        vendor: "3er",
        approval_fields: { kind: "einzelabnahme", data: {} },
      }),
    ).toBe("Einzelabnahme BMW 3er");
  });
});
