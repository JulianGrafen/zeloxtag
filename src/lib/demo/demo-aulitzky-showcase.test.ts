import { describe, expect, it } from "vitest";

import {
  buildDemoAulitzkyPublicShowcasePayload,
  DEMO_AULITZKY_SOUND_URL,
  getDemoAulitzkyTagScan,
} from "./demo-aulitzky-showcase";

describe("demo Aulitzky partner showcase", () => {
  it("exposes only public mods, not invoice amounts", () => {
    const scan = getDemoAulitzkyTagScan();
    const privateInvoices = scan.documents.filter(
      (doc) => doc.show_on_public_showcase !== true && doc.amount != null,
    );
    expect(privateInvoices.length).toBeGreaterThan(0);

    const payload = buildDemoAulitzkyPublicShowcasePayload();
    expect(payload.profile.powerPs).toBe(720);
    expect(payload.profile.torqueNm).toBe(850);
    expect(payload.profile.accel100To200Sec).toBe(8.1);
    expect(payload.profile.vmaxKmh).toBe(305);
    expect(payload.modifications).toHaveLength(4);
    expect(payload.modifications.map((m) => m.label)).toContain(
      "Aulitzky Abgasanlage ab OPF",
    );
    expect(payload.b2bPartner?.name).toBe("Aulitzky Tuning");
    expect(payload.b2bPartner?.appOpenLabel).toBeUndefined();
    expect(payload.b2bPartner?.ctaLabel).toBe("Diesen Umbau anfragen");
    expect(payload.b2bPartner?.ctaHref).toContain("Abgasanlagen");
    expect(payload.profile.dynoChartUrl).toBeNull();
    expect(payload.profile.engineSoundUrl).toBe(DEMO_AULITZKY_SOUND_URL);
    expect(payload.buildDna?.archetype).toBe("Streckenwaffe");
    expect(payload.buildDna?.punchline).toContain("Aulitzky");
  });
});
