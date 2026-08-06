import { describe, expect, it } from "vitest";

import { resolveVehicleImage } from "./vehicle-image";

describe("resolveVehicleImage", () => {
  it("maps uploaded silhouettes to the same-origin proxy when vehicleId is set", () => {
    const vehicleId = "11111111-1111-4111-8111-111111111111";
    const match = resolveVehicleImage({
      make: "BMW",
      model: "530d",
      vehicleId,
      silhouetteImageUrl:
        "https://example.supabase.co/storage/v1/object/public/vehicle-silhouettes/x/silhouette.png?v=99",
    });
    expect(match).toEqual({
      src: `/api/vehicle/silhouette/${vehicleId}?v=99`,
      alt: "BMW 530d",
    });
  });

  it("keeps remote URL when vehicleId is missing", () => {
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

  it("maps Toyota Supra to the A80 showcase cutout", () => {
    const match = resolveVehicleImage({
      make: "Toyota",
      model: "Supra",
    });
    expect(match).toEqual({
      src: "/vehicles/supra-a80.png",
      alt: "Toyota Supra",
    });
  });
});
