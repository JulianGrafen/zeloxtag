import { describe, expect, it } from "vitest";

import {
  BUILD_DNA_SCHEMA_VERSION,
  parseShowcaseBuildDna,
  showcaseBuildDnaSchema,
} from "./build-dna-schema";

const validDna = {
  version: BUILD_DNA_SCHEMA_VERSION,
  archetype: "Heimlicher Renner",
  radar: [
    { category: "Leistung", score: 85 },
    { category: "Fahrwerk", score: 60 },
    { category: "Optik", score: 20 },
    { category: "Haltbarkeit", score: 75 },
    { category: "Akustik", score: 55 },
    { category: "Straßenlage", score: 70 },
  ],
  punchline: "Sieht harmlos aus, zieht wie ein Güterzug.",
};

describe("showcaseBuildDnaSchema", () => {
  it("accepts a valid payload", () => {
    expect(showcaseBuildDnaSchema.safeParse(validDna).success).toBe(true);
    expect(parseShowcaseBuildDna(validDna)).toEqual(validDna);
  });

  it("maps legacy English archetypes and radar labels to German", () => {
    const legacy = {
      archetype: "Street Sleeper",
      radar: [
        { category: "Power", score: 85 },
        { category: "Handling", score: 60 },
        { category: "Style", score: 20 },
        { category: "Reliability", score: 75 },
        { category: "Acoustics", score: 55 },
        { category: "Street", score: 70 },
      ],
      punchline: "Legacy punchline.",
    };
    expect(parseShowcaseBuildDna(legacy)).toMatchObject({
      archetype: "Heimlicher Renner",
      radar: validDna.radar,
      punchline: "Legacy punchline.",
      version: BUILD_DNA_SCHEMA_VERSION,
    });
  });

  it("rejects legacy four-axis radar", () => {
    const legacyFour = {
      archetype: "Heimlicher Renner",
      radar: [
        { category: "Leistung", score: 85 },
        { category: "Fahrwerk", score: 60 },
        { category: "Optik", score: 20 },
        { category: "Haltbarkeit", score: 75 },
      ],
      punchline: "Alt.",
    };
    expect(parseShowcaseBuildDna(legacyFour)).toBeNull();
  });

  it("rejects wrong radar length", () => {
    const result = showcaseBuildDnaSchema.safeParse({
      ...validDna,
      radar: validDna.radar.slice(0, 3),
    });
    expect(result.success).toBe(false);
  });

  it("rejects scores outside 1–100", () => {
    const result = showcaseBuildDnaSchema.safeParse({
      ...validDna,
      radar: [
        { category: "Leistung", score: 0 },
        { category: "Fahrwerk", score: 60 },
        { category: "Optik", score: 20 },
        { category: "Haltbarkeit", score: 75 },
        { category: "Akustik", score: 50 },
        { category: "Straßenlage", score: 50 },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects unknown archetype", () => {
    const result = showcaseBuildDnaSchema.safeParse({
      ...validDna,
      archetype: "Drift Missile",
    });
    expect(result.success).toBe(false);
  });
});
