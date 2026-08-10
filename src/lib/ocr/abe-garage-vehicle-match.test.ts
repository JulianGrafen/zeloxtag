import { describe, expect, it } from "vitest";

import {
  expandGarageModelToAbeTokens,
  scoreHaystackAgainstGarageVehicle,
} from "@/lib/ocr/abe-garage-vehicle-match";

describe("abe-garage-vehicle-match", () => {
  it("maps BMW 320d to 3er tokens", () => {
    expect(expandGarageModelToAbeTokens("320d")).toEqual(
      expect.arrayContaining(["320d", "3er", "3er reihe"]),
    );
  });

  it("maps Mercedes C200 to C-Klasse tokens", () => {
    expect(expandGarageModelToAbeTokens("C200")).toEqual(
      expect.arrayContaining(["c200", "c klasse"]),
    );
  });

  it("scores ABE section headers against garage vehicle", () => {
    const score = scoreHaystackAgainstGarageVehicle("3ER REIHE", {
      brand: "BMW",
      model: "320d",
    });
    expect(score).toBeGreaterThanOrEqual(4);
  });

  it("scores VW GTI against Golf section", () => {
    const score = scoreHaystackAgainstGarageVehicle("GOLF GTI", {
      brand: "Volkswagen",
      model: "GTI",
    });
    expect(score).toBeGreaterThan(0);
  });
});
