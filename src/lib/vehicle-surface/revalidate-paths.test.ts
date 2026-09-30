import { beforeEach, describe, expect, it, vi } from "vitest";

const { revalidatePath } = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath,
}));

vi.mock("@/lib/tags/get-active-tag-uuid-for-vehicle", () => ({
  getActiveTagUuidForVehicle: vi.fn(async () => null),
}));

import { revalidateVehicleSurfacePaths } from "@/lib/vehicle-surface/revalidate-paths";

describe("revalidateVehicleSurfacePaths", () => {
  beforeEach(() => {
    revalidatePath.mockClear();
  });

  it("revalidates digital garage paths when there is no linked tag", () => {
    const vehicleId = "a1b2c3d4-e5f6-4789-a012-3456789abcde";
    revalidateVehicleSurfacePaths(
      { vehicleId, linkedTagUuid: null },
      ["/umbauten"],
    );

    expect(revalidatePath).toHaveBeenCalledWith(
      `/garage/${vehicleId}/umbauten`,
    );
    expect(revalidatePath).not.toHaveBeenCalledWith(
      expect.stringMatching(/^\/v\//),
    );
  });

  it("revalidates garage and tag paths when a tag is linked", () => {
    const vehicleId = "a1b2c3d4-e5f6-4789-a012-3456789abcde";
    const tagUuid = "zlx-deadbeef";
    revalidateVehicleSurfacePaths(
      { vehicleId, linkedTagUuid: tagUuid },
      ["/umbauten"],
    );

    expect(revalidatePath).toHaveBeenCalledWith(
      `/garage/${vehicleId}/umbauten`,
    );
    expect(revalidatePath).toHaveBeenCalledWith(`/v/${tagUuid}/umbauten`);
  });
});
