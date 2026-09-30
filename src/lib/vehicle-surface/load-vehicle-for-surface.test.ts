import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getActiveTagUuidForVehicle: vi.fn(),
  getTagByUuid: vi.fn(),
  hydrateTagScanWithSessionDocuments: vi.fn(),
  loadVehicleProjectionMaybeSingle: vi.fn(),
  createClient: vi.fn(),
}));

vi.mock("@/lib/auth/get-user", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock("@/lib/tags/get-active-tag-uuid-for-vehicle", () => ({
  getActiveTagUuidForVehicle: mocks.getActiveTagUuidForVehicle,
}));

vi.mock("@/lib/tags/get-tag-by-uuid", () => ({
  getTagByUuid: mocks.getTagByUuid,
  hydrateTagScanWithSessionDocuments: mocks.hydrateTagScanWithSessionDocuments,
}));

vi.mock("@/lib/vehicles/load-vehicle-projection", () => ({
  loadVehicleProjectionMaybeSingle: mocks.loadVehicleProjectionMaybeSingle,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

import { loadVehicleSurfaceByVehicleId } from "@/lib/vehicle-surface/load-vehicle-for-surface";

describe("loadVehicleSurfaceByVehicleId", () => {
  const vehicleId = "a1b2c3d4-e5f6-4789-a012-3456789abcde";
  const vehicle = {
    id: vehicleId,
    user_id: "user-1",
    make: "VW",
    model: "Golf",
    year: 2019,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createClient.mockReturnValue({ from: vi.fn() });
    mocks.loadVehicleProjectionMaybeSingle.mockResolvedValue({
      data: vehicle,
      error: null,
    });
    mocks.getActiveTagUuidForVehicle.mockResolvedValue(null);
    mocks.getCurrentUser.mockResolvedValue({ id: "user-1" });
    mocks.hydrateTagScanWithSessionDocuments.mockImplementation(async (scan) => ({
      ...scan,
      documents: [{ id: "doc-1", title: "Umbau", type: "invoice" }],
    }));
  });

  it("hydrates documents for tagless garage vehicles when the viewer is signed in", async () => {
    const loaded = await loadVehicleSurfaceByVehicleId(vehicleId, {
      documents: { mode: "types", types: ["invoice"], columns: "invoice" },
    });

    expect(mocks.hydrateTagScanWithSessionDocuments).toHaveBeenCalled();
    expect(loaded?.result.documents).toHaveLength(1);
    expect(loaded?.scope).toEqual({ vehicleId, linkedTagUuid: null });
  });

  it("skips hydration for guests on tagless vehicles", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);

    const loaded = await loadVehicleSurfaceByVehicleId(vehicleId);

    expect(mocks.hydrateTagScanWithSessionDocuments).not.toHaveBeenCalled();
    expect(loaded?.result.documents).toEqual([]);
  });

  // Register-without-tag: SSR returned documents: [] while DB had rows.
  it("regression: tagless owner must hydrate documents (not skip with empty array)", async () => {
    mocks.hydrateTagScanWithSessionDocuments.mockImplementation(async (scan) => ({
      ...scan,
      documents: [
        { id: "doc-1", title: "Umbau A", type: "invoice" },
        { id: "doc-2", title: "Umbau B", type: "invoice" },
      ],
    }));

    const loaded = await loadVehicleSurfaceByVehicleId(vehicleId);

    expect(mocks.hydrateTagScanWithSessionDocuments).toHaveBeenCalledTimes(1);
    expect(loaded?.result.documents).toHaveLength(2);
  });
});
