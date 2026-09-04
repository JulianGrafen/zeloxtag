import { describe, expect, it } from "vitest";

import {
  MEMBERSHIP_REQUIRED_MESSAGE,
  PRO_PLAN_ANNUAL_PRICE,
  PRO_ANNUAL_SAVINGS_COPY,
  PRO_PLAN_MONTHLY_DAILY_PRICE,
  PRO_PLAN_BENEFITS,
  PRO_TRIAL_DAYS,
  cloudAboHref,
  proCheckoutButtonLabel,
  proCheckoutLead,
} from "@/lib/billing/pro-plan";

describe("pro plan copy", () => {
  it("promises a 14-day trial for first checkout", () => {
    expect(PRO_TRIAL_DAYS).toBe(14);
    expect(proCheckoutLead("new")).toContain("14 Tage");
    expect(proCheckoutLead("new")).toContain("kostenlos");
    expect(proCheckoutButtonLabel("new")).toContain("14 Tage");
  });

  it("does not re-promise a trial to returning subscribers", () => {
    expect(proCheckoutLead("returning")).not.toContain("14 Tage");
    expect(proCheckoutButtonLabel("returning")).toContain("4,99");
  });

  it("exposes daily price equivalents for plan pickers", () => {
    expect(PRO_PLAN_MONTHLY_DAILY_PRICE).toBe("0,16 €");
  });

  it("highlights annual savings for the plan picker", () => {
    expect(PRO_ANNUAL_SAVINGS_COPY).toBe("Spare 17%!");
  });

  it("supports annual checkout copy", () => {
    expect(proCheckoutButtonLabel("new", "annual")).toContain("14 Tage");
    expect(proCheckoutLead("new", "annual")).toContain("14 Tage");
    expect(proCheckoutLead("new", "annual")).toContain(PRO_PLAN_ANNUAL_PRICE);
    expect(proCheckoutButtonLabel("returning", "annual")).toContain("Jahresabo");
  });

  it("lists the core Pro benefits", () => {
    expect(PRO_PLAN_BENEFITS.length).toBeGreaterThanOrEqual(4);
    expect(PRO_PLAN_BENEFITS.some((item) => item.includes("ABE"))).toBe(true);
    expect(PRO_PLAN_BENEFITS.some((item) => item.includes("Schrauber"))).toBe(
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
