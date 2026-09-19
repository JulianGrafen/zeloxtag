import { describe, expect, it } from "vitest";

import {
  getPaywallPersonalization,
  inferPrimaryGoalFromFeature,
  resolvePaywallGoal,
} from "@/lib/billing/paywall-personalization";
import { FEATURE } from "@/lib/permissions/feature-access";

describe("paywall personalization", () => {
  it("infers goal from pro feature gates", () => {
    expect(inferPrimaryGoalFromFeature(FEATURE.GENERATE_EXPOSE)).toBe(
      "werterhalt",
    );
    expect(inferPrimaryGoalFromFeature(FEATURE.SCAN_AI_RECEIPT)).toBe(
      "documents",
    );
    expect(inferPrimaryGoalFromFeature(FEATURE.DOCUMENT_VAULT)).toBe(
      "documents",
    );
    expect(inferPrimaryGoalFromFeature(FEATURE.INVITE_SCHRAUBER)).toBe(
      "documents",
    );
  });

  it("prefers stored primary goal over feature inference", () => {
    expect(
      resolvePaywallGoal({
        primaryGoal: "showcase",
        feature: FEATURE.GENERATE_EXPOSE,
      }),
    ).toBe("showcase");
    expect(
      resolvePaywallGoal({
        primaryGoal: null,
        feature: FEATURE.GENERATE_EXPOSE,
      }),
    ).toBe("werterhalt");
  });

  it("returns goal-specific headline, visual, and lead benefit", () => {
    const werterhalt = getPaywallPersonalization({ goal: "werterhalt" });
    expect(werterhalt.headline.length).toBeGreaterThan(10);
    expect(werterhalt.visualKind).toBe("resale_chart");
    expect(werterhalt.benefits[0]?.startsWith("Werterhalt:")).toBe(true);
    expect(werterhalt.ctaLabel).toContain("Verkaufswert");

    const showcase = getPaywallPersonalization({ goal: "showcase" });
    expect(showcase.visualKind).toBe("showcase_qr");
    expect(showcase.benefits[0]?.startsWith("QR auf Treffen:")).toBe(true);

    const documents = getPaywallPersonalization({ goal: "documents" });
    expect(documents.visualKind).toBe("vault_gap");
    expect(documents.benefits[0]?.startsWith("Gutachten-Tresor:")).toBe(true);
  });

  it("sharpens documents headline when free scan is exhausted", () => {
    const base = getPaywallPersonalization({ goal: "documents" });
    const exhausted = getPaywallPersonalization({
      goal: "documents",
      variant: "free_scan_exhausted",
    });
    expect(exhausted.headline).not.toBe(base.headline);
    expect(exhausted.headline).toContain("Gratis-Scan");
  });
});
