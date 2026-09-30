import { beforeEach, describe, expect, it, vi } from "vitest";

const { resolveRevalidationScope, revalidateVehicleSurfacePaths } = vi.hoisted(
  () => ({
    resolveRevalidationScope: vi.fn(),
    revalidateVehicleSurfacePaths: vi.fn(),
  }),
);

vi.mock("@/lib/vehicle-surface/revalidate-paths", () => ({
  resolveRevalidationScope,
  revalidateVehicleSurfacePaths,
  revalidateDocumentDetailPaths: vi.fn(),
}));

import { revalidateManualEntryPaths } from "@/lib/documents/manual-entry-paths";

describe("revalidateManualEntryPaths", () => {
  const vehicleId = "a1b2c3d4-e5f6-4789-a012-3456789abcde";

  beforeEach(() => {
    vi.clearAllMocks();
    resolveRevalidationScope.mockResolvedValue({
      vehicleId,
      linkedTagUuid: null,
    });
  });

  it("revalidates digital garage surfaces for tagless vehicles", async () => {
    await revalidateManualEntryPaths(vehicleId);

    expect(resolveRevalidationScope).toHaveBeenCalledWith(vehicleId);
    expect(revalidateVehicleSurfacePaths).toHaveBeenCalledWith(
      { vehicleId, linkedTagUuid: null },
      [
        "",
        "/eintrag",
        "/umbauten",
        "/service",
        "/dokumente",
        "/intervalle",
        "/historie",
      ],
    );
  });
});
