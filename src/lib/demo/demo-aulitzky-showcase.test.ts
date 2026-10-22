import { describe, expect, it } from "vitest";

import {
  buildDemoAulitzkyPublicShowcasePayload,
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
    expect(payload.modifications).toHaveLength(4);
    expect(payload.modifications.map((m) => m.label)).toContain(
      "Aulitzky Abgasanlage ab OPF",
    );
    expect(payload.b2bPartner?.name).toBe("Aulitzky Tuning");
    expect(payload.featureFlags?.partnerPerformanceHero).toBe(true);
  });
});
