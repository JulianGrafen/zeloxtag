import { describe, expect, it } from "vitest";

import {
  parseShowcaseBuildDna,
  showcaseBuildDnaSchema,
} from "./build-dna-schema";

const validDna = {
  archetype: "Street Sleeper",
  radar: [
    { category: "Power", score: 85 },
    { category: "Handling", score: 60 },
    { category: "Style", score: 20 },
    { category: "Reliability", score: 75 },
  ],
  punchline: "Sieht harmlos aus, zieht wie ein Güterzug.",
};

describe("showcaseBuildDnaSchema", () => {
  it("accepts a valid payload", () => {
    expect(showcaseBuildDnaSchema.safeParse(validDna).success).toBe(true);
    expect(parseShowcaseBuildDna(validDna)).toEqual(validDna);
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
        { category: "Power", score: 0 },
        { category: "Handling", score: 60 },
        { category: "Style", score: 20 },
        { category: "Reliability", score: 75 },
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
