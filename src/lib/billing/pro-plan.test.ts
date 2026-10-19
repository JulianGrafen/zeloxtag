import { describe, expect, it } from "vitest";

import { FREE_AI_INVOICE_SCAN_LIMIT } from "@/lib/billing/free-scan-constants";
import {
  MEMBERSHIP_REQUIRED_MESSAGE,
  PRO_ANNUAL_RECOMMENDED_LABEL,
  PRO_ANNUAL_SAVINGS_COPY,
  PRO_FREE_KI_SCAN_HOOK,
  PRO_PLAN_ANNUAL_EQUIVALENT_MONTHLY,
  PRO_PLAN_ANNUAL_PRICE,
  PRO_PLAN_BENEFITS,
  PRO_PLAN_CHECKOUT_HEADLINE,
  PRO_PLAN_CHECKOUT_SUBLINE,
  PRO_PAYWALL_MODAL_SUBLINE,
  PRO_PAYWALL_TRIAL_TIMELINE,
  PRO_TRIAL_DAYS,
  cloudAboHref,
  proCheckoutButtonLabel,
  proCheckoutLead,
  proCheckoutMicroCopy,
  proIntervalPickerDetail,
  proIntervalPriceDisplay,
} from "@/lib/billing/pro-plan";

describe("pro plan copy", () => {
  it("does not promise a 14-day trial for new checkout", () => {
    expect(PRO_TRIAL_DAYS).toBe(14);
    expect(proCheckoutLead("new")).not.toContain("14 Tage");
    expect(proCheckoutLead("new")).toContain("Tag 1");
    expect(proCheckoutButtonLabel("new", "monthly")).toContain("4,99");
    expect(proCheckoutMicroCopy("monthly")).toContain("Abrechnung ab sofort");
  });

  it("does not re-promise a trial to returning subscribers", () => {
    expect(proCheckoutLead("returning")).not.toContain("14 Tage");
    expect(proCheckoutButtonLabel("returning", "monthly")).toContain("4,99");
    expect(proCheckoutButtonLabel("returning", "annual")).toContain("Jahresabo");
  });

  it("uses benefit-led checkout messaging", () => {
    expect(PRO_PLAN_CHECKOUT_HEADLINE).toContain("Handschuhfach");
    expect(PRO_PLAN_CHECKOUT_SUBLINE).toContain("lückenlos");
    expect(PRO_PAYWALL_MODAL_SUBLINE).toBe(PRO_PLAN_CHECKOUT_SUBLINE);
  });

  it("shows monthly price on the plan picker", () => {
    expect(proIntervalPriceDisplay("monthly").primary).toContain("4,99 €");
    expect(proIntervalPriceDisplay("monthly").secondary).toContain("kündbar");
  });

  it("highlights annual savings with gifted months framing", () => {
    expect(PRO_ANNUAL_RECOMMENDED_LABEL).toBe("Beliebteste Wahl");
    expect(PRO_ANNUAL_SAVINGS_COPY).toContain("2 Monate geschenkt");
    expect(proIntervalPickerDetail("annual")).toContain("Spare 10 €");
    expect(proIntervalPriceDisplay("annual").secondary).toContain(
      PRO_PLAN_ANNUAL_EQUIVALENT_MONTHLY,
    );
  });

  it("supports annual checkout copy", () => {
    expect(proCheckoutButtonLabel("new", "annual")).toContain(PRO_PLAN_ANNUAL_PRICE);
    expect(proCheckoutLead("new", "annual")).toContain(PRO_PLAN_ANNUAL_PRICE);
    expect(proCheckoutLead("new", "annual")).not.toContain("14 Tage");
    expect(proCheckoutButtonLabel("returning", "annual")).toContain("Jahresabo");
  });

  it("shows interval-aware micro copy under the CTA", () => {
    expect(proCheckoutMicroCopy("annual")).toContain("4,16 €/Mo");
    expect(proCheckoutMicroCopy("monthly")).toContain("4,99 €/Mo");
  });

  it("frames paywall timeline around free scans and Pro", () => {
    expect(FREE_AI_INVOICE_SCAN_LIMIT).toBe(2);
    expect(PRO_PAYWALL_TRIAL_TIMELINE[0]?.text).toContain("Free:");
    expect(PRO_FREE_KI_SCAN_HOOK).toContain("2× Rechnung");
  });

  it("lists benefit-led Pro arguments", () => {
    expect(PRO_PLAN_BENEFITS.length).toBe(9);
    expect(PRO_PLAN_BENEFITS.some((item) => item.title.includes("Zettelchaos"))).toBe(
      true,
    );
    expect(PRO_PLAN_BENEFITS.some((item) => item.title.includes("Werkstatt"))).toBe(
      true,
    );
  });

  it("states that features require a membership", () => {
    expect(MEMBERSHIP_REQUIRED_MESSAGE).toContain("begrenzten KI-Scans");
    expect(cloudAboHref("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")).toBe(
      "/v/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/abo",
    );
  });
});
