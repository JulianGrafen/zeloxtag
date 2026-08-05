import { describe, expect, it } from "vitest";

import {
  collectFilterValues,
  matchesSearchQuery,
  normalizeSearchQuery,
} from "@/lib/documents/list-search";

describe("list-search", () => {
  it("normalizes case and diacritics", () => {
    expect(normalizeSearchQuery("  Front­spoiler  ")).toBe("frontspoiler");
  });

  it("matches when all tokens appear across fields", () => {
    expect(
      matchesSearchQuery("mazda spoiler", "Carbon Frontspoiler", "Mazda"),
    ).toBe(true);
    expect(matchesSearchQuery("bmw spoiler", "Carbon Frontspoiler", "Mazda")).toBe(
      false,
    );
  });

  it("treats empty query as match-all", () => {
    expect(matchesSearchQuery("  ", "anything")).toBe(true);
  });

  it("collects chip values by frequency", () => {
    expect(
      collectFilterValues(["Aerodynamik", "Räder", "Aerodynamik", null, ""]),
    ).toEqual([
      { id: "Aerodynamik", label: "Aerodynamik", count: 2 },
      { id: "Räder", label: "Räder", count: 1 },
    ]);
  });
});
