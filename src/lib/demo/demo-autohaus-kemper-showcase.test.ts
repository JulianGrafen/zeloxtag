import { describe, expect, it } from "vitest";

import { DEMO_ENGINE_SOUND_URL } from "./demo-assets";
import {
  buildDemoAutohausKemperPublicShowcasePayload,
  DEMO_AUTOHAUS_KEMPER_INSTAGRAM_HANDLE,
  DEMO_AUTOHAUS_KEMPER_LOGO_SRC,
  DEMO_AUTOHAUS_KEMPER_PARTNER_WEB_URL,
  DEMO_AUTOHAUS_KEMPER_SHOWCASE_IMAGE,
  getDemoAutohausKemperTagScan,
} from "./demo-autohaus-kemper-showcase";

describe("demo Autohaus Kemper partner showcase", () => {
  it("exposes Black Betty R32 with Unique Projects branding", () => {
    const scan = getDemoAutohausKemperTagScan();
    expect(scan.vehicle?.make).toBe("VW");
    expect(scan.vehicle?.model).toContain("Black Betty");

    const payload = buildDemoAutohausKemperPublicShowcasePayload();
    expect(payload.photos).toHaveLength(4);
    expect(payload.modifications).toHaveLength(4);
    expect(
      payload.modifications.some((m) => m.imageSrc?.startsWith("/demo/")),
    ).toBe(true);
    expect(
      payload.modifications.some((m) => m.label.includes("Carbon Breitbau")),
    ).toBe(true);
    expect(payload.b2bPartner?.kicker).toBe("Built by");
    expect(payload.b2bPartner?.name).toBe("Autohaus Kemper");
    expect(payload.b2bPartner?.logoSrc).toBe(DEMO_AUTOHAUS_KEMPER_LOGO_SRC);
    expect(payload.b2bPartner?.logoPresentation).toBe("wordmark");
    expect(payload.b2bPartner?.ctaHref).toBe(
      DEMO_AUTOHAUS_KEMPER_PARTNER_WEB_URL,
    );
    expect(payload.profile.heroImageSrc).toBe(
      DEMO_AUTOHAUS_KEMPER_SHOWCASE_IMAGE,
    );
    expect(payload.profile.instagramHandle).toBe(
      DEMO_AUTOHAUS_KEMPER_INSTAGRAM_HANDLE,
    );
    expect(payload.profile.engineSoundUrl).toBe(DEMO_ENGINE_SOUND_URL);
    expect(payload.buildDna?.punchline).toContain("Carbon Breitbau");
  });
});
