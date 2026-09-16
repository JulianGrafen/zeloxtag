import { describe, expect, it } from "vitest";

import { toGuestClientTagScanResult } from "@/lib/tags/public-tag-dto";
import type { TagScanResult } from "@/types/database";

function twin(overrides: { is_public?: boolean }): TagScanResult {
  return {
    tag: {
      id: "tag-1",
      uuid: "zlx-test",
      vehicle_id: null,
      status: "active",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    },
    vehicle: {
      id: "veh-1",
      user_id: "",
      make: "BMW",
      model: "M3",
      year: 2020,
      vin: null,
      tech_specs: { engineCode: "S58" },
      silhouette_image_url: "veh-1/sil.png",
      sound_url: null,
      is_public: overrides.is_public ?? false,
      hide_financials: true,
      public_slug: null,
      expose_token: null,
      is_expose_active: false,
      showcase_build_dna: null,
      showcase_build_dna_fingerprint: null,
      showcase_build_dna_updated_at: null,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    },
    documents: [],
  };
}

describe("toGuestClientTagScanResult", () => {
  it("strips tech_specs, silhouette, and vehicle id for private twins", () => {
    const guest = toGuestClientTagScanResult(twin({ is_public: false }));
    expect(guest.vehicle?.id).toBe("");
    expect(guest.vehicle?.tech_specs).toBeNull();
    expect(guest.vehicle?.silhouette_image_url).toBeNull();
    expect(guest.vehicle?.make).toBe("BMW");
  });

  it("keeps public showcase fields for public twins", () => {
    const guest = toGuestClientTagScanResult(twin({ is_public: true }));
    expect(guest.vehicle?.id).toBe("veh-1");
    expect(guest.vehicle?.tech_specs).toEqual({ engineCode: "S58" });
    expect(guest.vehicle?.silhouette_image_url).toBe("veh-1/sil.png");
  });
});
