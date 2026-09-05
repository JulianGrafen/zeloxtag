import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockIsVehiclePublicShowcase = vi.fn();
const mockCreateAdminClient = vi.fn();
const mockIsSupabaseAdminConfigured = vi.fn();
const mockEnforceRateLimit = vi.fn();

vi.mock("@/lib/vehicles/get-public-vehicle", () => ({
  isVehiclePublicShowcase: (...args: unknown[]) =>
    mockIsVehiclePublicShowcase(...args),
}));

vi.mock("@/lib/supabase/admin", () => ({
  isSupabaseAdminConfigured: () => mockIsSupabaseAdminConfigured(),
  createAdminClient: () => mockCreateAdminClient(),
}));

vi.mock("@/lib/security/api-guard", () => ({
  enforceRateLimit: (...args: unknown[]) => mockEnforceRateLimit(...args),
}));

const vehicleId = "11111111-1111-4111-8111-111111111111";
const documentId = "33333333-3333-4333-8333-333333333333";
const src = `https://example.supabase.co/storage/v1/object/public/documents/${vehicleId}/${documentId}-photo.jpg`;

describe("GET /api/public/vehicle/[vehicleId]/file", () => {
  beforeEach(() => {
    vi.resetModules();
    mockIsVehiclePublicShowcase.mockReset();
    mockCreateAdminClient.mockReset();
    mockIsSupabaseAdminConfigured.mockReset();
    mockEnforceRateLimit.mockReset();

    mockEnforceRateLimit.mockResolvedValue(null);
    mockIsSupabaseAdminConfigured.mockReturnValue(true);
    mockIsVehiclePublicShowcase.mockResolvedValue(true);
  });

  it("returns 403 when showcase flag is false", async () => {
    mockCreateAdminClient.mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  id: documentId,
                  category: "tuning",
                  invoice_number: "__manual__",
                  file_url: src,
                  type: "invoice",
                  show_on_public_showcase: false,
                },
                error: null,
              }),
            }),
          }),
        }),
      }),
      storage: {
        from: () => ({
          download: async () => ({ data: null, error: new Error("skip") }),
        }),
      },
    });

    const { GET } = await import(
      "@/app/api/public/vehicle/[vehicleId]/file/route"
    );
    const request = new NextRequest(
      `https://app.zeloxtag.de/api/public/vehicle/${vehicleId}/file?src=${encodeURIComponent(src)}`,
    );
    const response = await GET(request, {
      params: Promise.resolve({ vehicleId }),
    });

    expect(response.status).toBe(403);
  });
});
