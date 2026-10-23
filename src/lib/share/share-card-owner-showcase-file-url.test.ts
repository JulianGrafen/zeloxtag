import { describe, expect, it } from "vitest";

import {
  ownerShowcaseFileApiPath,
  toOwnerShareCardHeroSrc,
} from "./share-card-owner-showcase-file-url";

const vehicleId = "11111111-1111-4111-8111-111111111111";

describe("ownerShowcaseFileApiPath", () => {
  it("builds owner showcase-file URL with optional width", () => {
    expect(ownerShowcaseFileApiPath(vehicleId, "vehicles/x/photo.jpg", 960)).toBe(
      `/api/vehicle/${vehicleId}/showcase-file?src=vehicles%2Fx%2Fphoto.jpg&w=960`,
    );
  });
});

describe("toOwnerShareCardHeroSrc", () => {
  it("keeps public gallery URL when showcase is public", () => {
    const publicUrl = `/api/public/vehicle/${vehicleId}/file?src=vehicles%2Fx%2Fphoto.jpg`;
    expect(toOwnerShareCardHeroSrc(vehicleId, publicUrl, true)).toBe(publicUrl);
  });

  it("rewrites public gallery URL for private showcase", () => {
    const publicUrl = `/api/public/vehicle/${vehicleId}/file?src=vehicles%2Fx%2Fphoto.jpg&w=800`;
    expect(toOwnerShareCardHeroSrc(vehicleId, publicUrl, false)).toBe(
      `/api/vehicle/${vehicleId}/showcase-file?src=vehicles%2Fx%2Fphoto.jpg&w=800`,
    );
  });

  it("leaves catalog URLs unchanged", () => {
    const catalog = "/api/vehicle/catalog/bmw-530d.png";
    expect(toOwnerShareCardHeroSrc(vehicleId, catalog, false)).toBe(catalog);
  });
});
