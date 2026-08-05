import { describe, expect, it } from "vitest";

import { resolveVehicleImage } from "./vehicle-image";

describe("resolveVehicleImage", () => {
  it("prefers uploaded silhouette over catalog cutouts", () => {
    const match = resolveVehicleImage({
      make: "BMW",
      model: "530d",
      silhouetteImageUrl: "https://example.com/cutout.png",
    });
    expect(match).toEqual({
      src: "https://example.com/cutout.png",
      alt: "BMW 530d",
    });
  });

  it("falls back to catalog when silhouette is empty", () => {
    const match = resolveVehicleImage({
      make: "BMW",
      model: "530d",
      silhouetteImageUrl: "  ",
    });
    expect(match?.src).toBe("/vehicles/bmw-530d.png");
  });

  it("returns undefined when nothing matches", () => {
    expect(
      resolveVehicleImage({
        make: "Unknown",
        model: "Car",
        silhouetteImageUrl: null,
      }),
    ).toBeUndefined();
  });
});
