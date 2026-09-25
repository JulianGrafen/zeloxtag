import { describe, expect, it } from "vitest";

import {
  buildPersonalityLabels,
  parseBuildPersonalityTags,
} from "./build-personality-chips";

describe("parseBuildPersonalityTags", () => {
  it("accepts valid ids and dedupes", () => {
    expect(
      parseBuildPersonalityTags([
        "sleeper",
        "sleeper",
        "oem_plus",
        "invalid",
        "schiff",
      ]),
    ).toEqual(["sleeper", "oem_plus", "schiff"]);
  });

  it("caps at five tags", () => {
    const tags = parseBuildPersonalityTags([
      "groschengrab",
      "schiff",
      "sleeper",
      "oem_plus",
      "dieselrakete",
      "frontkratzer",
      "daily",
    ]);
    expect(tags).toHaveLength(5);
  });

  it("returns empty for non-array", () => {
    expect(parseBuildPersonalityTags(null)).toEqual([]);
  });
});

describe("buildPersonalityLabels", () => {
  it("maps ids to German labels", () => {
    expect(buildPersonalityLabels(["kurvenraeuber", "oem_plus"])).toEqual([
      "Kurvenräuber",
      "OEM+",
    ]);
  });
});
