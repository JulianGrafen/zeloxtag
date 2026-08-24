import { beforeEach, describe, expect, it, vi } from "vitest";

import type { VehicleWriteAccess } from "@/lib/auth/vehicle-write-access";
import { userHasActiveMembership } from "@/lib/billing/membership-store";
import { FEATURE } from "@/lib/permissions/feature-access";
import { assertVehicleDocumentWrite } from "@/lib/permissions/require-feature";

vi.mock("@/lib/billing/membership-store", () => ({
  userHasActiveMembership: vi.fn(),
}));

const contributorAccess: VehicleWriteAccess = {
  ok: true,
  isOwner: false,
  isContributor: true,
  ownerUserId: "owner-1",
  vehicleId: "vehicle-1",
};

describe("assertVehicleDocumentWrite", () => {
  beforeEach(() => {
    vi.mocked(userHasActiveMembership).mockReset();
  });

  it("allows Schrauber uploads when the vehicle owner has Pro", async () => {
    vi.mocked(userHasActiveMembership).mockResolvedValue(true);

    const result = await assertVehicleDocumentWrite(
      contributorAccess,
      FEATURE.DOCUMENT_VAULT,
    );

    expect(result).toEqual({ ok: true });
    expect(userHasActiveMembership).toHaveBeenCalledWith("owner-1");
  });

  it("blocks Schrauber uploads when the vehicle owner lacks Pro", async () => {
    vi.mocked(userHasActiveMembership).mockResolvedValue(false);

    const result = await assertVehicleDocumentWrite(
      contributorAccess,
      FEATURE.SCAN_AI_RECEIPT,
    );

    expect(result.ok).toBe(false);
  });
});
