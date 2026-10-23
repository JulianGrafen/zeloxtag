import { readFile } from "node:fs/promises";

import { describe, expect, it, vi } from "vitest";

import type { Document, Vehicle } from "@/types/database";

import { SHOWCASE_GALLERY_MARKER } from "@/lib/documents/showcase-gallery";

import {
  loadShareCardHeroBytes,
  parseOwnerShowcaseFileHeroPath,
  resolveShareCardHeroPath,
} from "./resolve-share-card-hero";
import { resolveShareCardStoryHeroApiPath } from "./share-card-story-hero-url";
import { loadVehicleSilhouetteBytes } from "@/lib/vehicles/load-silhouette-bytes";
import { loadShowcaseStorageImageBytes } from "@/lib/vehicles/load-showcase-storage-image";

vi.mock("@/lib/vehicles/load-silhouette-bytes", () => ({
  loadVehicleSilhouetteBytes: vi.fn(),
}));

vi.mock("@/lib/vehicles/load-showcase-storage-image", () => ({
  loadShowcaseStorageImageBytes: vi.fn(),
}));

vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(),
}));

const vehicleId = "11111111-1111-4111-8111-111111111111";

const baseVehicle: Vehicle = {
  id: vehicleId,
  user_id: "22222222-2222-4222-8222-222222222222",
  make: "BMW",
  model: "530d",
  year: 2011,
  vin: null,
  tech_specs: { powerPs: 350 },
  silhouette_image_url: "https://example.supabase.co/storage/v1/object/public/x/hero.png",
  sound_url: null,
  spatial_scene: null,
  is_public: true,
  hide_financials: false,
  public_slug: "bmw-530d",
  showcase_swipe_opt_in: false,
  is_story_public: false,
  expose_token: null,
  is_expose_active: false,
  showcase_build_dna: null,
  showcase_build_dna_fingerprint: null,
  showcase_build_dna_updated_at: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-02T00:00:00Z",
};

describe("parseOwnerShowcaseFileHeroPath", () => {
  it("parses owner showcase-file hero URLs", () => {
    expect(
      parseOwnerShowcaseFileHeroPath(
        `/api/vehicle/${vehicleId}/showcase-file?src=vehicles%2Fx%2Fphoto.jpg`,
      ),
    ).toEqual({
      vehicleId,
      src: "vehicles/x/photo.jpg",
    });
  });
});

describe("resolveShareCardHeroPath", () => {
  it("returns silhouette proxy when silhouette_image_url is set", () => {
    const path = resolveShareCardHeroPath(baseVehicle, []);
    expect(path).toContain(`/api/vehicle/silhouette/${vehicleId}`);
  });

  it("falls back to catalog when no photos", () => {
    const path = resolveShareCardHeroPath(
      { ...baseVehicle, silhouette_image_url: null },
      [],
    );
    expect(path).toMatch(/\/api\/vehicle\/catalog\//);
  });
});

describe("loadShareCardHeroBytes", () => {
  it("uses gallery storage when silhouette is empty", async () => {
    vi.mocked(loadVehicleSilhouetteBytes).mockResolvedValue(null);
    vi.mocked(loadShowcaseStorageImageBytes).mockResolvedValue(
      Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    );

    const doc = {
      id: "33333333-3333-4333-8333-333333333333",
      vehicle_id: vehicleId,
      title: "Photo",
      type: "other",
      file_url: "vehicles/x/photo.jpg",
      amount: null,
      date: null,
      invoice_number: SHOWCASE_GALLERY_MARKER,
      show_on_public_showcase: true,
      created_at: "2026-01-01T00:00:00Z",
    } as Document;

    const bytes = await loadShareCardHeroBytes(
      { ...baseVehicle, silhouette_image_url: null },
      [doc],
    );
    expect(bytes).not.toBeNull();
    expect(loadShowcaseStorageImageBytes).toHaveBeenCalled();
  });

  it("reads catalog bytes from disk without HTTP", async () => {
    vi.mocked(loadVehicleSilhouetteBytes).mockResolvedValue(null);
    vi.mocked(loadShowcaseStorageImageBytes).mockResolvedValue(null);
    vi.mocked(readFile).mockResolvedValue(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    );

    const bytes = await loadShareCardHeroBytes(
      { ...baseVehicle, silhouette_image_url: null },
      [],
    );

    expect(bytes).not.toBeNull();
    expect(readFile).toHaveBeenCalled();
  });
});

describe("resolveShareCardStoryHeroApiPath", () => {
  it("builds owner story-hero URL", () => {
    expect(resolveShareCardStoryHeroApiPath(vehicleId, "1")).toBe(
      `/api/vehicle/${vehicleId}/story-hero?v=1`,
    );
  });
});
