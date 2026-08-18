import { describe, expect, it } from "vitest";

import {
  buildStripePaymentLinkUrl,
  checkoutReturnUrl,
  safeAppReturnPath,
} from "@/lib/billing/stripe";
import { STRIPE_PRO_PAYMENT_LINK } from "@/lib/billing/constants";

describe("safeAppReturnPath", () => {
  it("keeps in-app paths", () => {
    expect(safeAppReturnPath("/v/tag-1/abo")).toBe("/v/tag-1/abo");
    expect(safeAppReturnPath("/settings")).toBe("/settings");
  });

  it("rejects open redirects", () => {
    expect(safeAppReturnPath("https://evil.example")).toBe("/settings");
    expect(safeAppReturnPath("//evil.example")).toBe("/settings");
    expect(safeAppReturnPath("javascript:alert(1)")).toBe("/settings");
  });
});

describe("checkoutReturnUrl", () => {
  it("stays on the app origin", () => {
    expect(
      checkoutReturnUrl("https://app.zeloxtag.de", "/v/abc/abo", {
        checkout: "cancel",
      }),
    ).toBe("https://app.zeloxtag.de/v/abc/abo?checkout=cancel");
  });
});

describe("buildStripePaymentLinkUrl", () => {
  const userId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

  it("attaches the ZeloxTag user id and email", () => {
    const url = buildStripePaymentLinkUrl({
      paymentLink: STRIPE_PRO_PAYMENT_LINK,
      userId,
      email: "owner@zeloxtag.de",
    });
    expect(url).toContain("buy.stripe.com/bJefZb2B3dKEbmVb3B0sU00");
    expect(url).toContain(`client_reference_id=${userId}`);
    expect(url).toContain("prefilled_email=owner%40zeloxtag.de");
    expect(url).toContain("locale=de");
  });

  it("rejects a non-Stripe host", () => {
    expect(
      buildStripePaymentLinkUrl({
        paymentLink: "https://evil.example/pay",
        userId,
      }),
    ).toBeNull();
  });
});
