import { describe, expect, it } from "vitest";

import { computeShareCardLayout } from "./share-card-layout";
import type { ShareableBuildData } from "./types";

function baseData(overrides: Partial<ShareableBuildData> = {}): ShareableBuildData {
  return {
    modelName: "BMW M2 · 2018",
    instagramHandle: null,
    specRows: [],
    modificationsCount: 0,
    buildDna: null,
    ...overrides,
  };
}

describe("computeShareCardLayout", () => {
  it("uses comfortable density for few specs", () => {
    const layout = computeShareCardLayout(
      baseData({
        specRows: [
          { key: "power", label: "Leistung", valueText: "480 PS", layout: "quartett" },
        ],
      }),
    );
    expect(layout.density).toBe("comfortable");
    expect(layout.contentScale).toBe(1);
  });

  it("scales content when many specs and DNA compete for space", () => {
    const layout = computeShareCardLayout(
      baseData({
        instagramHandle: "very_long_instagram_handle_name",
        modificationsCount: 12,
        buildDna: {
          version: 2,
          archetype: "Streckenwaffe",
          punchline: "Test",
          radar: [
            { category: "Leistung", score: 50 },
            { category: "Fahrwerk", score: 50 },
            { category: "Optik", score: 50 },
            { category: "Haltbarkeit", score: 50 },
            { category: "Akustik", score: 50 },
            { category: "Straßenlage", score: 50 },
          ],
        },
        specRows: Array.from({ length: 11 }, (_, index) => ({
          key: `row-${index}`,
          label: "Label",
          valueText: "Value",
          layout: "inline" as const,
        })),
      }),
    );
    expect(layout.density).toBe("dense");
    expect(layout.heroHeightPercent).toBeLessThanOrEqual(33);
    expect(layout.footerLogoHeightPx).toBeLessThan(152);
    expect(layout.dnaZonePercent).toBe(30);
    expect(layout.specsZonePercent).toBeGreaterThan(0);
  });

  it("reserves no DNA zone when build DNA is absent", () => {
    const layout = computeShareCardLayout(
      baseData({
        specRows: [
          { key: "power", label: "Leistung", valueText: "480 PS", layout: "quartett" },
        ],
      }),
    );
    expect(layout.dnaZonePercent).toBe(0);
  });
});
