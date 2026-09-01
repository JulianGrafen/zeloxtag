import { describe, expect, it } from "vitest";

import { resolveVehicleCatalogImage, resolveVehicleImage } from "./vehicle-image";

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

  it("maps a relative silhouette storage path to the same-origin proxy", () => {
    const vehicleId = "11111111-1111-4111-8111-111111111111";
    const match = resolveVehicleImage({
      make: "BMW",
      model: "530d",
      vehicleId,
      silhouetteImageUrl: `${vehicleId}/silhouette.png`,
    });
    expect(match?.src.startsWith(`/api/vehicle/silhouette/${vehicleId}?v=`)).toBe(
      true,
    );
    expect(match?.alt).toBe("BMW 530d");
  });

  it("ignores remote URL without vehicleId and uses catalog", () => {
    const match = resolveVehicleImage({
      make: "BMW",
      model: "530d",
      silhouetteImageUrl: "https://example.com/cutout.png",
    });
    expect(match?.src).toBe("/api/vehicle/catalog/bmw-530d.png");
  });

  it("falls back to catalog when silhouette is empty", () => {
    const match = resolveVehicleImage({
      make: "BMW",
      model: "530d",
      silhouetteImageUrl: "  ",
    });
    expect(match?.src).toBe("/api/vehicle/catalog/bmw-530d.png");
  });

  it("resolveVehicleCatalogImage maps BMW 530d", () => {
    const match = resolveVehicleCatalogImage("BMW", "530d");
    expect(match?.src).toBe("/api/vehicle/catalog/bmw-530d.png");
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

  it("maps BMW E36 328i to the E36 showcase cutout", () => {
    const match = resolveVehicleImage({
      make: "BMW",
      model: "328i",
    });
    expect(match).toEqual({
      src: "/api/vehicle/catalog/bmw-e36.png",
      alt: "BMW E36",
    });
  });

  it("maps Toyota Supra to the A80 showcase cutout", () => {
    const match = resolveVehicleImage({
      make: "Toyota",
      model: "Supra",
    });
    expect(match).toEqual({
      src: "/api/vehicle/catalog/supra-a80.png",
      alt: "Toyota Supra",
    });
  });
});
