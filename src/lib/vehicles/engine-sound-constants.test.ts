import { describe, expect, it } from "vitest";

import {
  ownerEngineSoundDisplayPath,
  resolveOwnerEngineSoundViewUrl,
} from "@/lib/vehicles/engine-sound-constants";

const vehicleId = "8f3a9b2c-1234-5678-9abc-def012345678";

describe("resolveOwnerEngineSoundViewUrl", () => {
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
