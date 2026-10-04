import { describe, expect, it } from "vitest";

import { parseVehicleRoastResult } from "@/lib/roast/roast-schema";

describe("parseVehicleRoastResult", () => {
  it("accepts single punchline payload", () => {
    const parsed = parseVehicleRoastResult({
      punchline:
        "Du hast dir mehr Ausstrahlung gekauft als du jemals nutzen wirst.",
    });
    expect(parsed?.punchline).toContain("Ausstrahlung");
  });

  it("coerces legacy multi-field roast to first punchline", () => {
    const parsed = parseVehicleRoastResult({
      roast_title: "x",
      cringe_factor: 80,
      punchlines: [
        "Stage 2 auf Serienbremsen — der Mut der Unwissenden.",
        "zweiter",
        "dritter",
      ],
      verdict: "y",
      highlight_mod: "z",
    });
    expect(parsed?.punchline).toContain("Mut");
  });
});
