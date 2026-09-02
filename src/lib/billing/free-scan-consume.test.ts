import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockUserHasActiveMembership = vi.fn();
const mockIsSupabaseAdminConfigured = vi.fn();
const mockCreateAdminClient = vi.fn();

vi.mock("@/lib/billing/membership-store", () => ({
  userHasActiveMembership: (...args: unknown[]) =>
    mockUserHasActiveMembership(...args),
}));

vi.mock("@/lib/supabase/admin", () => ({
  isSupabaseAdminConfigured: () => mockIsSupabaseAdminConfigured(),
  createAdminClient: () => mockCreateAdminClient(),
}));

function entitlementAdminClient(invoiceUsed: number, abeUsed = 0) {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: {
              free_ai_invoice_scans_used: invoiceUsed,
              free_ai_abe_scans_used: abeUsed,
            },
            error: null,
          }),
        }),
      }),
    }),
    rpc: async (name: string) => {
      if (name === "consume_free_ai_invoice_scan") {
        return { data: invoiceUsed === 0, error: null };
      }
      if (name === "consume_free_ai_abe_scan") {
        return { data: abeUsed === 0, error: null };
      }
      return { data: false, error: null };
    },
  };
}

describe("tryConsumeFreeOcrScanForOwner", () => {
  beforeEach(() => {
    vi.resetModules();
    mockUserHasActiveMembership.mockReset();
    mockIsSupabaseAdminConfigured.mockReset();
    mockCreateAdminClient.mockReset();
    mockIsSupabaseAdminConfigured.mockReturnValue(true);
    mockUserHasActiveMembership.mockResolvedValue(false);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("skips consumption for Pro members", async () => {
    mockUserHasActiveMembership.mockResolvedValue(true);
    const { tryConsumeFreeOcrScanForOwner } = await import("./free-scan-quota");

    const result = await tryConsumeFreeOcrScanForOwner(
      "owner-1",
      { allowFreeInvoiceScan: true },
      "invoice",
    );

    expect(result).toEqual({ ok: true, consumed: false });
    expect(mockCreateAdminClient).not.toHaveBeenCalled();
  });

  it("consumes invoice quota at parse time for Free users", async () => {
    mockCreateAdminClient.mockReturnValue(entitlementAdminClient(0));
    const { tryConsumeFreeOcrScanForOwner } = await import("./free-scan-quota");

    const result = await tryConsumeFreeOcrScanForOwner(
      "owner-1",
      { allowFreeInvoiceScan: true },
      "invoice",
    );

    expect(result).toEqual({ ok: true, consumed: true });
  });

  it("returns exhausted when invoice quota is already used", async () => {
    mockCreateAdminClient.mockReturnValue(entitlementAdminClient(1));
    const { tryConsumeFreeOcrScanForOwner } = await import("./free-scan-quota");

    const result = await tryConsumeFreeOcrScanForOwner(
      "owner-1",
      { allowFreeInvoiceScan: true },
      "invoice",
    );

    expect(result).toEqual({ ok: false, code: "free_scan_exhausted" });
  });

  it("does not consume when documentType is missing", async () => {
    const { tryConsumeFreeOcrScanForOwner } = await import("./free-scan-quota");

    const result = await tryConsumeFreeOcrScanForOwner(
      "owner-1",
      { allowFreeInvoiceScan: true },
      undefined,
    );

    expect(result).toEqual({ ok: true, consumed: false });
    expect(mockCreateAdminClient).not.toHaveBeenCalled();
  });

  it("fails closed when admin client is unavailable", async () => {
    mockIsSupabaseAdminConfigured.mockReturnValue(false);
    const { tryConsumeFreeOcrScanForOwner } = await import("./free-scan-quota");

    const result = await tryConsumeFreeOcrScanForOwner(
      "owner-1",
      { allowFreeInvoiceScan: true },
      "invoice",
    );

    expect(result).toEqual({ ok: false, code: "quota_unavailable" });
  });
});
