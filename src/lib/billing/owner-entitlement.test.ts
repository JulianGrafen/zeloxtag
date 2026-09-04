import { beforeEach, describe, expect, it, vi } from "vitest";

import { userHasActiveMembership } from "@/lib/billing/membership-store";
import {
  ownerCanUseAiAbeScan,
  ownerCanUseAiInvoiceScan,
} from "@/lib/billing/free-scan-quota";
import {
  ownerHasProSubscription,
  ownerMayUseProFeature,
} from "@/lib/billing/owner-entitlement";

vi.mock("@/lib/billing/membership-store", () => ({
  userHasActiveMembership: vi.fn(),
}));

vi.mock("@/lib/billing/free-scan-quota", () => ({
  ownerCanUseAiInvoiceScan: vi.fn(),
  ownerCanUseAiAbeScan: vi.fn(),
}));

describe("owner-entitlement", () => {
  beforeEach(() => {
    vi.mocked(userHasActiveMembership).mockReset();
    vi.mocked(ownerCanUseAiInvoiceScan).mockReset();
    vi.mocked(ownerCanUseAiAbeScan).mockReset();
  });

  it("grants Pro features when Supabase membership is active", async () => {
    vi.mocked(userHasActiveMembership).mockResolvedValue(true);

    await expect(ownerHasProSubscription("user-1")).resolves.toBe(true);
    await expect(
      ownerMayUseProFeature("user-1", { allowFreeInvoiceScan: true }),
    ).resolves.toBe(true);
  });

  it("allows complimentary invoice scan without Pro", async () => {
    vi.mocked(userHasActiveMembership).mockResolvedValue(false);
    vi.mocked(ownerCanUseAiInvoiceScan).mockResolvedValue(true);

    await expect(
      ownerMayUseProFeature("user-1", { allowFreeInvoiceScan: true }),
    ).resolves.toBe(true);
  });

  it("blocks when neither Pro nor free scan remains", async () => {
    vi.mocked(userHasActiveMembership).mockResolvedValue(false);
    vi.mocked(ownerCanUseAiInvoiceScan).mockResolvedValue(false);
    vi.mocked(ownerCanUseAiAbeScan).mockResolvedValue(false);

    await expect(ownerMayUseProFeature("user-1")).resolves.toBe(false);
    await expect(
      ownerMayUseProFeature("user-1", { allowFreeInvoiceScan: true }),
    ).resolves.toBe(false);
  });
});
