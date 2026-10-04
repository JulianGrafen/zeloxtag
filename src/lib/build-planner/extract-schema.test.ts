import { describe, expect, it } from "vitest";

import { parsePlannedModExtractResult } from "@/lib/build-planner/extract-schema";

describe("parsePlannedModExtractResult", () => {
  it("accepts a Gewindefahrwerk example", () => {
    const parsed = parsePlannedModExtractResult({
      part: {
        title: "KW V3 Gewindefahrwerk",
        manufacturer: "KW",
        category: "chassis",
        plannedPriceEur: 1899,
        productUrl: "https://example.de/kw-v3",
      },
      todos: [
        { title: "Fahrwerk entfernen", sortOrder: 0 },
        { title: "KW V3 einbauen", sortOrder: 1 },
        { title: "Achsvermessung", sortOrder: 2 },
        { title: "TÜV §19.3 prüfen", sortOrder: 3 },
      ],
      confidence: "high",
      warnings: [],
    });

    expect(parsed?.part.title).toBe("KW V3 Gewindefahrwerk");
    expect(parsed?.todos).toHaveLength(4);
  });

  it("pads too few todos after normalization", () => {
    const parsed = parsePlannedModExtractResult({
      part: { title: "Spoiler" },
      todos: [{ title: "Montieren", sortOrder: 0 }],
      confidence: "low",
      warnings: [],
    });
    expect(parsed?.part.title).toBe("Spoiler");
    expect(parsed?.todos.length).toBeGreaterThanOrEqual(3);
  });
});
