import { describe, expect, it } from "vitest";

import { parseStripeMembershipAction } from "@/lib/billing/stripe-membership";

const USER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const PERIOD = 1785000000;

describe("parseStripeMembershipAction", () => {
  it("keeps checkout pending until subscription period data arrives", () => {
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
      status: "pending",
      userId: USER_ID,
      email: "owner@zeloxtag.de",
      stripeCustomerId: "cus_123",
      stripeSubscriptionId: "sub_123",
      currentPeriodEnd: null,
    });
  });

  it("activates checkout when the subscription object includes period end", () => {
    const action = parseStripeMembershipAction("checkout.session.completed", {
      mode: "subscription",
      payment_status: "paid",
      client_reference_id: USER_ID,
      customer: "cus_123",
      subscription: {
        object: "subscription",
        id: "sub_123",
        status: "active",
        customer: "cus_123",
        metadata: { user_id: USER_ID },
        current_period_end: PERIOD,
      },
      customer_details: { email: "owner@zeloxtag.de" },
      metadata: { user_id: USER_ID },
    });
    expect(action).toMatchObject({
      status: "active",
      currentPeriodEnd: new Date(PERIOD * 1000).toISOString(),
    });
  });

  it("keeps subscription updates pending without period end", () => {
    const action = parseStripeMembershipAction("customer.subscription.updated", {
      id: "sub_123",
      status: "active",
      customer: "cus_123",
      metadata: { user_id: USER_ID },
      items: { data: [{ price: { id: "price_cloud" } }] },
    });
    expect(action?.status).toBe("pending");
    expect(action?.currentPeriodEnd).toBeNull();
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

  it("handles invoice.payment_succeeded like invoice.paid", () => {
    const action = parseStripeMembershipAction("invoice.payment_succeeded", {
      customer: "cus_123",
      customer_email: "owner@zeloxtag.de",
      subscription: "sub_123",
      period_end: PERIOD,
      lines: {
        data: [{ period: { end: PERIOD } }],
      },
    });
    expect(action?.status).toBe("active");
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
