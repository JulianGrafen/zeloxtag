import { describe, expect, it } from "vitest";

import {
  isShareCardCatalogCutout,
  shareCardImageCrossOrigin,
} from "./share-card-image-cross-origin";

describe("shareCardImageCrossOrigin", () => {
  it("omits crossOrigin for same-origin API paths", () => {
    expect(
      shareCardImageCrossOrigin(
        "/api/vehicle/silhouette/11111111-1111-4111-8111-111111111111?v=1&w=960",
      ),
    ).toBeUndefined();
    expect(
      shareCardImageCrossOrigin("/api/vehicle/catalog/bmw-530d.png"),
    ).toBeUndefined();
  });

  it("uses anonymous for remote URLs", () => {
    expect(shareCardImageCrossOrigin("https://cdn.example.com/car.png")).toBe(
      "anonymous",
    );
  });
});

describe("isShareCardCatalogCutout", () => {
  it("detects catalog cutout URLs", () => {
    expect(isShareCardCatalogCutout("/api/vehicle/catalog/bmw-e36.png")).toBe(
      true,
    );
    expect(
      isShareCardCatalogCutout("/api/vehicle/silhouette/x?v=1"),
    ).toBe(false);
  });
});
