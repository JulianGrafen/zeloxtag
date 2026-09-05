import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCreateAdminClient = vi.fn();
const mockIsSupabaseAdminConfigured = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  isSupabaseAdminConfigured: () => mockIsSupabaseAdminConfigured(),
  createAdminClient: () => mockCreateAdminClient(),
}));

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    cache: (fn: (...args: unknown[]) => unknown) => fn,
  };
});

const vehicleId = "11111111-1111-4111-8111-111111111111";

describe("sessionCanAccessVehicleMedia", () => {
  beforeEach(() => {
    vi.resetModules();
    mockCreateAdminClient.mockReset();
    mockIsSupabaseAdminConfigured.mockReset();
    mockIsSupabaseAdminConfigured.mockReturnValue(true);
  });

  it("allows anonymous access for published showcases", async () => {
    mockCreateAdminClient.mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: { user_id: "owner", is_public: true },
              error: null,
            }),
          }),
        }),
      }),
    });

    const { sessionCanAccessVehicleMedia } = await import("./vehicle-access");
    await expect(
      sessionCanAccessVehicleMedia(vehicleId, null),
    ).resolves.toBe(true);
  });

  it("denies anonymous access for expose-only vehicles", async () => {
    mockCreateAdminClient.mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: { user_id: "owner", is_public: false },
              error: null,
            }),
          }),
        }),
      }),
    });

    const { sessionCanAccessVehicleMedia } = await import("./vehicle-access");
    await expect(
      sessionCanAccessVehicleMedia(vehicleId, null),
    ).resolves.toBe(false);
  });
});
