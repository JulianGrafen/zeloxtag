import { describe, expect, it } from "vitest";

import {
  buildDemoRwEditionPublicShowcasePayload,
  DEMO_RW_EDITION_DYNO_CHART_URL,
  DEMO_RW_EDITION_INSTAGRAM_HANDLE,
  DEMO_RW_EDITION_LOGO_SRC,
  DEMO_RW_EDITION_SHOWCASE_IMAGE,
  DEMO_RW_EDITION_STAGE2,
  getDemoRwEditionTagScan,
} from "./demo-rw-edition-showcase";

describe("demo RW Edition partner showcase", () => {
  it("exposes Prüfstand 301 PS / 428 Nm, dyno photo and RW Edition partner branding", () => {
    const scan = getDemoRwEditionTagScan();
    const privateInvoices = scan.documents.filter(
      (doc) => doc.show_on_public_showcase !== true && doc.amount != null,
    );
    expect(privateInvoices.length).toBeGreaterThan(0);

    const payload = buildDemoRwEditionPublicShowcasePayload();
    expect(payload.profile.powerPs).toBe(DEMO_RW_EDITION_STAGE2.powerPs);
    expect(payload.profile.torqueNm).toBe(DEMO_RW_EDITION_STAGE2.torqueNm);
    expect(payload.profile.notes).toContain("301 PS");
    expect(payload.profile.notes).toContain("428 Nm");
    expect(payload.modifications).toHaveLength(4);
    expect(payload.modifications.map((m) => m.label)).toEqual([
      "HJS Downpipe mit Sportkatalysator",
      "Neue Zündkerzen",
      "Ölwechsel inkl. Ölfilter",
      "Individuelle, saubere und effiziente Motorabstimmung",
    ]);
    expect(payload.buildDna?.punchline).toContain("301 PS");
    expect(payload.b2bPartner?.name).toBe("RW Edition");
    expect(payload.b2bPartner?.logoSrc).toBe(DEMO_RW_EDITION_LOGO_SRC);
    expect(payload.profile.instagramHandle).toBe(DEMO_RW_EDITION_INSTAGRAM_HANDLE);
    expect(payload.b2bPartner?.ctaLabel).toBe("Diesen Umbau anfragen");
    expect(payload.profile.heroImageSrc).toBe(DEMO_RW_EDITION_SHOWCASE_IMAGE);
    expect(payload.photos).toHaveLength(4);
    expect(payload.photos.map((photo) => photo.src)).toEqual([
      DEMO_RW_EDITION_SHOWCASE_IMAGE,
      "/demo/rw-edition-rear.jpg",
      "/demo/rw-edition-workshop.jpg",
      "/demo/rw-edition-exhaust.jpg",
    ]);
    expect(payload.profile.dynoChartUrl).toBe(DEMO_RW_EDITION_DYNO_CHART_URL);
    expect(payload.profile.dynoChartIsImage).toBe(true);
    expect(payload.buildDna?.archetype).toBe("OEM+");
  });
});
