import { describe, expect, it } from "vitest";

import { buildOwnerShareableBuildData } from "./build-owner-shareable-build-data";
import type { Document, Vehicle } from "@/types/database";

const vehicle: Vehicle = {
  id: "11111111-1111-4111-8111-111111111111",
  user_id: "22222222-2222-4222-8222-222222222222",
  make: "BMW",
  model: "530d",
  year: 2018,
  vin: null,
  tech_specs: { powerPs: 286, torqueNm: 650, accel0To100Sec: 5.4 },
  silhouette_image_url: null,
  sound_url: null,
  spatial_scene: null,
  is_public: true,
  hide_financials: true,
  public_slug: "slug",
  showcase_swipe_opt_in: false,
  is_story_public: false,
  expose_token: null,
  is_expose_active: false,
  showcase_build_dna: null,
  showcase_build_dna_fingerprint: null,
  showcase_build_dna_updated_at: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

describe("buildOwnerShareableBuildData", () => {
  it("falls back to catalog cutout when no owner silhouette is stored", () => {
    const data = buildOwnerShareableBuildData(vehicle, [] as Document[]);
    expect(data?.imageUrl).toContain("/api/vehicle/catalog/bmw-530d.png");
  });
});
