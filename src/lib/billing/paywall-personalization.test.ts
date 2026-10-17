import { describe, expect, it } from "vitest";

import {
  getPaywallPersonalization,
  inferPrimaryGoalFromFeature,
  paywallGoalOverrideForDashboardTile,
  paywallGoalOverrideForScanType,
  paywallVehicleShortName,
  resolvePaywallGoal,
} from "@/lib/billing/paywall-personalization";
import {
  PRO_PAYWALL_CONVERSION_BENEFITS,
  PRO_PAYWALL_CONVERSION_FOOTNOTE,
  PRO_PAYWALL_CONVERSION_SUBLINE,
  PRO_TRIAL_LABEL,
} from "@/lib/billing/pro-plan";
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

  it("forces Werterhalt for Rechnung triggers over stored goal", () => {
    expect(paywallGoalOverrideForScanType("invoice")).toBe("werterhalt");
    expect(paywallGoalOverrideForScanType("repair")).toBeUndefined();
    expect(paywallGoalOverrideForDashboardTile("invoices")).toBe("werterhalt");
    expect(
      resolvePaywallGoal({
        primaryGoal: "documents",
        feature: FEATURE.SCAN_AI_RECEIPT,
        context: { goalOverride: "werterhalt" },
      }),
    ).toBe("werterhalt");
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

  it("returns unified conversion copy for all goals", () => {
    const werterhalt = getPaywallPersonalization({ goal: "werterhalt" });
    const showcase = getPaywallPersonalization({ goal: "showcase" });

    expect(werterhalt.headline).toBe("Dein Build. Lückenlos.");
    expect(werterhalt.subline).toBe(PRO_PAYWALL_CONVERSION_SUBLINE);
    expect(werterhalt.ctaLabel).toBe(PRO_TRIAL_LABEL);
    expect(werterhalt.footnote).toBe(PRO_PAYWALL_CONVERSION_FOOTNOTE);
    expect(werterhalt.showProBadge).toBe(false);
    expect(werterhalt.benefits).toEqual(PRO_PAYWALL_CONVERSION_BENEFITS);
    expect(werterhalt.benefits[0]).toContain("Build-Wert & Exposé");
    expect(werterhalt.benefits[2]).toContain("PDF-Expose");

    expect(showcase.headline).toBe(werterhalt.headline);
    expect(showcase.benefits).toEqual(werterhalt.benefits);
  });

  it("strips year from vehicle headline", () => {
    expect(paywallVehicleShortName("Toyota GR Supra · 2022")).toBe(
      "Toyota GR Supra",
    );
    const personalized = getPaywallPersonalization({
      goal: "werterhalt",
      vehicleLabel: "Toyota GR Supra · 2022",
    });
    expect(personalized.headline).toBe("Dein Toyota GR Supra. Lückenlos.");
    expect(personalized.vehicleEyebrow).toBeNull();
  });

  it("keeps same headline when free scan is exhausted (kicker only in UI)", () => {
    const base = getPaywallPersonalization({ goal: "documents" });
    const exhausted = getPaywallPersonalization({
      goal: "documents",
      variant: "free_scan_exhausted",
    });
    expect(exhausted.headline).toBe(base.headline);
  });
});
