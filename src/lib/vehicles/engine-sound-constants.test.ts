import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  ownerEngineSoundDisplayPath,
  publicVehicleEngineSoundPath,
  resolveOwnerEngineSoundViewUrl,
  resolvePublicEngineSoundHref,
} from "@/lib/vehicles/engine-sound-constants";

const vehicleId = "8f3a9b2c-1234-5678-9abc-def012345678";
const FIXED_NOW = 1_791_118_280_152;

describe("resolveOwnerEngineSoundViewUrl", () => {
  beforeEach(() => {
    vi.spyOn(Date, "now").mockReturnValue(FIXED_NOW);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns null when nothing is stored", () => {
    expect(resolveOwnerEngineSoundViewUrl(vehicleId, null)).toBeNull();
    expect(resolveOwnerEngineSoundViewUrl(vehicleId, "  ")).toBeNull();
  });

  it("uses the owner session proxy for storage paths", () => {
    const href = resolveOwnerEngineSoundViewUrl(
      vehicleId,
      `${vehicleId}/engine-sound.m4a`,
    );
    expect(href).toBe(ownerEngineSoundDisplayPath(vehicleId));
  });

  it("does not use the public proxy in owner preview", () => {
    const href = resolveOwnerEngineSoundViewUrl(
      vehicleId,
      `/api/public/vehicle/${vehicleId}/engine-sound`,
    );
    expect(href).toBe(ownerEngineSoundDisplayPath(vehicleId));
  });

  it("keeps an existing owner proxy URL (cache bust)", () => {
    const stored = `/api/vehicle/engine-sound/${vehicleId}?v=123`;
    expect(resolveOwnerEngineSoundViewUrl(vehicleId, stored)).toBe(stored);
  });
});

describe("resolvePublicEngineSoundHref", () => {
  it("returns null when nothing is stored", () => {
    expect(resolvePublicEngineSoundHref(vehicleId, null)).toBeNull();
  });

  it("uses the public proxy for storage paths", () => {
    expect(
      resolvePublicEngineSoundHref(vehicleId, `${vehicleId}/engine-sound.m4a`),
    ).toBe(publicVehicleEngineSoundPath(vehicleId));
  });

  it("maps owner session proxy URLs to the public proxy", () => {
    expect(
      resolvePublicEngineSoundHref(
        vehicleId,
        `/api/vehicle/engine-sound/${vehicleId}?v=123`,
      ),
    ).toBe(publicVehicleEngineSoundPath(vehicleId));
  });

  it("rejects unknown API paths", () => {
    expect(
      resolvePublicEngineSoundHref(vehicleId, "/api/other/audio"),
    ).toBeNull();
  });
});
