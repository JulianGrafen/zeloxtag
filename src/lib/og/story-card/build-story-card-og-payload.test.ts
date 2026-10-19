import { describe, expect, it } from "vitest";

import {
  buildStoryCardOgPayload,
  formatStoryCardTrustBadge,
} from "./build-story-card-og-payload";
import type { Document, Vehicle } from "@/types/database";

const vehicle: Vehicle = {
  id: "11111111-1111-4111-8111-111111111111",
  user_id: "22222222-2222-4222-8222-222222222222",
  make: "BMW",
  model: "530d",
  year: 2018,
  vin: null,
  tech_specs: { powerPs: 350, torqueNm: 700, accel0To100Sec: 5.1 },
  silhouette_image_url: null,
  sound_url: null,
  spatial_scene: null,
  is_public: true,
  hide_financials: false,
  public_slug: "bmw-530d-demo",
  showcase_swipe_opt_in: false,
  is_story_public: true,
  expose_token: null,
  is_expose_active: false,
  showcase_build_dna: null,
  showcase_build_dna_fingerprint: null,
  showcase_build_dna_updated_at: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const invoiceDoc = {
  id: "doc-1",
  vehicle_id: vehicle.id,
  user_id: vehicle.user_id,
  title: "Tuning Rechnung",
  type: "invoice",
  file_url: "https://example.com/inv.pdf",
  amount: 4200,
  date: "2025-06-01",
  created_at: "2025-06-02T00:00:00Z",
  category: "tuning",
  line_items: [
    { label: "Stage 2 Software", amount: 2500 },
    { label: "Downpipe", amount: 1700 },
    { label: "Ölwechsel", amount: 120 },
  ],
} as unknown as Document;

describe("buildStoryCardOgPayload", () => {
  it("formats trust badge with app origin and slug", () => {
    expect(
      formatStoryCardTrustBadge("bmw-530d-demo", "https://app.zeloxtag.de"),
    ).toBe("Verified Build • app.zeloxtag.de/v/bmw-530d-demo");
  });

  it("picks top mods by invested amount and shows total invested", () => {
    const payload = buildStoryCardOgPayload({
      vehicle,
      documents: [invoiceDoc],
      siteOrigin: "https://app.zeloxtag.de",
      heroImageDataUri: null,
    });

    expect(payload).not.toBeNull();
    expect(payload!.powerLabel).toContain("350 PS");
    expect(payload!.topMods.slice(0, 2)).toEqual([
      "Stage 2 Software",
      "Downpipe",
    ]);
    expect(payload!.totalInvestedLabel).toMatch(/4\.200/);
  });

  it("hides total invested when hide_financials is true", () => {
    const payload = buildStoryCardOgPayload({
      vehicle: { ...vehicle, hide_financials: true },
      documents: [invoiceDoc],
      siteOrigin: "https://app.zeloxtag.de",
    });

    expect(payload?.totalInvestedLabel).toBeNull();
  });
});
