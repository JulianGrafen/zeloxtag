import { describe, expect, it } from "vitest";

import { parseStripeMembershipAction } from "@/lib/billing/stripe-membership";

const USER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const PERIOD = 1785000000;

describe("parseStripeMembershipAction", () => {
  it("activates on a paid subscription checkout", () => {
    const action = parseStripeMembershipAction("checkout.session.completed", {
      mode: "subscription",
      payment_status: "paid",
      client_reference_id: USER_ID,
      customer: "cus_123",
      subscription: "sub_123",
      customer_details: { email: "owner@zeloxtag.de" },
      metadata: { user_id: USER_ID },
    });
    expect(action).toMatchObject({
      status: "active",
      userId: USER_ID,
      email: "owner@zeloxtag.de",
      stripeCustomerId: "cus_123",
      stripeSubscriptionId: "sub_123",
    });
  });

  it("reads period end from subscription items (Stripe 2025+)", () => {
    const action = parseStripeMembershipAction("customer.subscription.updated", {
      id: "sub_123",
      status: "active",
      customer: "cus_123",
      metadata: { user_id: USER_ID },
      items: {
        data: [
          {
            current_period_end: PERIOD,
            price: { id: "price_cloud" },
          },
        ],
      },
    });
    expect(action?.status).toBe("active");
    expect(action?.stripePriceId).toBe("price_cloud");
    expect(action?.currentPeriodEnd).toBe(new Date(PERIOD * 1000).toISOString());
  });

  it("marks failed invoice payment as past_due", () => {
    const action = parseStripeMembershipAction("invoice.payment_failed", {
      customer: "cus_123",
      customer_email: "owner@zeloxtag.de",
      subscription: "sub_123",
      parent: { subscription_details: { subscription: "sub_123" } },
    });
    expect(action?.status).toBe("past_due");
    expect(action?.stripeSubscriptionId).toBe("sub_123");
  });

  it("cancels when the subscription is deleted", () => {
    expect(
      parseStripeMembershipAction("customer.subscription.deleted", {
        id: "sub_123",
        status: "canceled",
        customer: "cus_123",
        metadata: { user_id: USER_ID },
      })?.status,
    ).toBe("canceled");
  });

  it("ignores one-time checkouts", () => {
    expect(
      parseStripeMembershipAction("checkout.session.completed", {
        mode: "payment",
        payment_status: "paid",
        metadata: { user_id: USER_ID },
      }),
    ).toBeNull();
  });
});
