import { describe, expect, it } from "vitest";

import { membershipNeedsStripeReconcile } from "./membership-store";
import type { Membership } from "@/types/database";

function baseMembership(overrides: Partial<Membership> = {}): Membership {
  return {
    id: "m1",
    user_id: "user-1",
    email: "owner@example.com",
    shopify_customer_id: null,
    shopify_order_id: null,
    shopify_order_name: null,
    shopify_order_number: null,
    shopify_order_token: null,
    shopify_product_id: null,
    stripe_customer_id: "cus_1",
    stripe_subscription_id: "sub_1",
    stripe_price_id: null,
    billing_provider: "stripe",
    revenuecat_app_user_id: null,
    revenuecat_product_id: null,
    status: "active",
    current_period_end: "2020-01-01T00:00:00.000Z",
    trial_started_at: null,
    trial_ends_at: null,
    paid_at: null,
    canceled_at: null,
    created_at: "",
    updated_at: "",
    ...overrides,
  };
}

describe("membershipNeedsStripeReconcile", () => {
  it("reconciles when active but period end is stale in DB", () => {
    expect(membershipNeedsStripeReconcile(baseMembership())).toBe(true);
  });

  it("skips when already Pro entitled", () => {
    const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    expect(
      membershipNeedsStripeReconcile(
        baseMembership({ current_period_end: future }),
      ),
    ).toBe(false);
  });

  it("skips Shopify-only rows without Stripe subscription", () => {
    expect(
      membershipNeedsStripeReconcile(
        baseMembership({
          billing_provider: "shopify",
          stripe_subscription_id: null,
          stripe_customer_id: null,
        }),
      ),
    ).toBe(false);
  });
});
