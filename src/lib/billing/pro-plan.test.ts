import { describe, expect, it } from "vitest";

import {
  MEMBERSHIP_REQUIRED_MESSAGE,
  PRO_ANNUAL_RECOMMENDED_LABEL,
  PRO_ANNUAL_SAVINGS_COPY,
  PRO_PLAN_ANNUAL_EQUIVALENT_MONTHLY,
  PRO_PLAN_ANNUAL_PRICE,
  PRO_PLAN_BENEFITS,
  PRO_PLAN_CHECKOUT_HEADLINE,
  PRO_PLAN_CHECKOUT_SUBLINE,
  PRO_TRIAL_DAYS,
  PRO_TRIAL_LABEL,
  cloudAboHref,
  proCheckoutButtonLabel,
  proCheckoutLead,
  proCheckoutMicroCopy,
  proIntervalPickerDetail,
  proIntervalPriceDisplay,
} from "@/lib/billing/pro-plan";

describe("pro plan copy", () => {
  it("promises a 14-day trial for first checkout", () => {
    expect(PRO_TRIAL_DAYS).toBe(14);
    expect(PRO_TRIAL_LABEL).toBe("14 Tage kostenlos testen");
    expect(proCheckoutLead("new")).toContain("14 Tage");
    expect(proCheckoutLead("new")).toContain("kostenlos");
    expect(proCheckoutButtonLabel("new")).toBe(PRO_TRIAL_LABEL);
  });

  it("does not re-promise a trial to returning subscribers", () => {
    expect(proCheckoutLead("returning")).not.toContain("14 Tage");
    expect(proCheckoutButtonLabel("returning", "monthly")).toContain("4,99");
    expect(proCheckoutButtonLabel("returning", "annual")).toContain("Jahresabo");
  });

  it("uses benefit-led checkout messaging", () => {
    expect(PRO_PLAN_CHECKOUT_HEADLINE).toContain("Maximum");
    expect(PRO_PLAN_CHECKOUT_SUBLINE).toContain("14 Tage kostenlos");
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
    expect(proCheckoutButtonLabel("new", "annual")).toBe(PRO_TRIAL_LABEL);
    expect(proCheckoutLead("new", "annual")).toContain("14 Tage");
    expect(proCheckoutLead("new", "annual")).toContain(PRO_PLAN_ANNUAL_PRICE);
    expect(proCheckoutButtonLabel("returning", "annual")).toContain("Jahresabo");
  });

  it("shows interval-aware micro copy under the CTA", () => {
    expect(proCheckoutMicroCopy("annual")).toContain("4,16 €/Mo");
    expect(proCheckoutMicroCopy("monthly")).toContain("4,99 €/Mo");
  });

  it("lists benefit-led Pro arguments", () => {
    expect(PRO_PLAN_BENEFITS.length).toBe(5);
    expect(PRO_PLAN_BENEFITS.some((item) => item.title.includes("Zettelchaos"))).toBe(
      true,
    );
    expect(PRO_PLAN_BENEFITS.some((item) => item.title.includes("Werkstatt"))).toBe(
      true,
    );
  });

  it("states that features require a membership", () => {
    expect(MEMBERSHIP_REQUIRED_MESSAGE).toContain("Pro");
    expect(cloudAboHref("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")).toBe(
      "/v/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/abo",
    );
  });
});
