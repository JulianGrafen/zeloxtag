import { describe, expect, it } from "vitest";

import { SHOWCASE_GALLERY_MARKER } from "@/lib/documents/showcase-gallery";

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

  it("rewrites public gallery hero to owner showcase-file when not public", () => {
    const doc = {
      id: "33333333-3333-4333-8333-333333333333",
      vehicle_id: vehicle.id,
      title: "Photo",
      type: "other",
      file_url: `${vehicle.id}/33333333-3333-4333-8333-333333333333/photo.jpg`,
      amount: null,
      date: null,
      invoice_number: SHOWCASE_GALLERY_MARKER,
      show_on_public_showcase: true,
      created_at: "2026-01-01T00:00:00Z",
    } as Document;

    const data = buildOwnerShareableBuildData(
      { ...vehicle, is_public: false, silhouette_image_url: null },
      [doc],
    );

    expect(data?.imageUrl).toContain(`/api/vehicle/${vehicle.id}/showcase-file`);
    expect(data?.imageUrl).not.toContain("/api/public/vehicle/");
  });
});
