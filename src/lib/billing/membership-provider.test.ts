import { describe, expect, it } from "vitest";

import {
  isStripeManagedMembership,
  shopifyMayUpdateEntitlement,
} from "@/lib/billing/membership-provider";
import type { Membership } from "@/types/database";

const baseMembership = (): Membership => ({
  id: "m1",
  user_id: "u1",
  email: "owner@zeloxtag.de",
  shopify_customer_id: null,
  shopify_order_id: null,
  shopify_order_name: null,
  shopify_order_number: null,
  shopify_order_token: null,
  shopify_product_id: null,
  stripe_customer_id: null,
  stripe_subscription_id: null,
  stripe_price_id: null,
  billing_provider: null,
  status: "active",
  current_period_end: "2099-01-01T00:00:00.000Z",
  paid_at: null,
  canceled_at: null,
  created_at: "",
  updated_at: "",
});

describe("membership-provider", () => {
  it("treats stripe subscription ids as stripe-managed", () => {
    expect(
      isStripeManagedMembership({
        ...baseMembership(),
        stripe_subscription_id: "sub_123",
      }),
    ).toBe(true);
  });

  it("blocks shopify entitlement updates for stripe-managed memberships", () => {
    expect(
      shopifyMayUpdateEntitlement({
        ...baseMembership(),
        billing_provider: "stripe",
        stripe_subscription_id: "sub_123",
      }),
    ).toBe(false);
  });

  it("allows shopify entitlement updates for legacy shopify-only rows", () => {
    expect(
      shopifyMayUpdateEntitlement({
        ...baseMembership(),
        billing_provider: "shopify",
        shopify_order_id: "8899",
      }),
    ).toBe(true);
  });
});
