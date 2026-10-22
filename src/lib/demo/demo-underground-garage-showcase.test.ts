import { describe, expect, it } from "vitest";

import { DEMO_AULITZKY_SOUND_URL } from "./demo-aulitzky-showcase";
import {
  buildDemoUndergroundGaragePublicShowcasePayload,
  DEMO_UNDERGROUND_GARAGE_DYNO_CHART_URL,
  DEMO_UNDERGROUND_GARAGE_INSTAGRAM_HANDLE,
  DEMO_UNDERGROUND_GARAGE_LOGO_SRC,
  DEMO_UNDERGROUND_GARAGE_SHOWCASE_IMAGE,
  DEMO_UNDERGROUND_GARAGE_STAGE1,
  getDemoUndergroundGarageTagScan,
} from "./demo-underground-garage-showcase";

describe("demo Underground Garage partner showcase", () => {
  it("exposes Stage 1 performance and short Umbau specification", () => {
    const scan = getDemoUndergroundGarageTagScan();
    const privateInvoices = scan.documents.filter(
      (doc) => doc.show_on_public_showcase !== true && doc.amount != null,
    );
    expect(privateInvoices.length).toBeGreaterThan(0);

    const payload = buildDemoUndergroundGaragePublicShowcasePayload();
    expect(payload.profile.powerPs).toBe(DEMO_UNDERGROUND_GARAGE_STAGE1.powerPs);
    expect(payload.profile.torqueNm).toBe(DEMO_UNDERGROUND_GARAGE_STAGE1.torqueNm);
    expect(payload.profile.accel0To100Sec).toBe(
      DEMO_UNDERGROUND_GARAGE_STAGE1.accel0To100Sec,
    );
    expect(payload.profile.accel100To200Sec).toBe(
      DEMO_UNDERGROUND_GARAGE_STAGE1.accel100To200Sec,
    );
    expect(payload.profile.notes).toContain("Underground Garage");
    expect(payload.profile.notes).not.toContain("Serie");
    expect(payload.modifications).toHaveLength(3);
    expect(payload.b2bPartner?.name).toBe("Underground Garage");
    expect(payload.b2bPartner?.logoSrc).toBe(DEMO_UNDERGROUND_GARAGE_LOGO_SRC);
    expect(payload.profile.instagramHandle).toBe(
      DEMO_UNDERGROUND_GARAGE_INSTAGRAM_HANDLE,
    );
    expect(payload.b2bPartner?.ctaLabel).toBe("Diesen Umbau anfragen");
    expect(payload.profile.heroImageSrc).toBe(
      DEMO_UNDERGROUND_GARAGE_SHOWCASE_IMAGE,
    );
    expect(payload.profile.dynoChartUrl).toBe(
      DEMO_UNDERGROUND_GARAGE_DYNO_CHART_URL,
    );
    expect(payload.profile.dynoChartIsImage).toBe(true);
    expect(payload.profile.engineSoundUrl).toBe(DEMO_AULITZKY_SOUND_URL);
    expect(payload.buildDna?.archetype).toBe("OEM+");
  });
});
