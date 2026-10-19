import { describe, expect, it } from "vitest";

import {
  parseRevenueCatSubscriberResponse,
  parseRevenueCatWebhookBody,
} from "@/lib/billing/revenuecat-membership";

describe("parseRevenueCatWebhookBody", () => {
  it("maps initial purchase to active membership", () => {
    const action = parseRevenueCatWebhookBody({
      event: {
        id: "evt_1",
        type: "INITIAL_PURCHASE",
        app_user_id: "user-uuid",
        product_id: "zelox_pro_monthly",
        expiration_at_ms: 1_800_000_000_000,
      },
    });
    expect(action?.userId).toBe("user-uuid");
    expect(action?.status).toBe("active");
    expect(action?.productId).toBe("zelox_pro_monthly");
  });

  it("maps expiration to canceled", () => {
    const action = parseRevenueCatWebhookBody({
      event: {
        id: "evt_2",
        type: "EXPIRATION",
        app_user_id: "user-uuid",
        product_id: "zelox_pro_monthly",
      },
    });
    expect(action?.status).toBe("canceled");
  });

  it("ignores unknown event types", () => {
    expect(
      parseRevenueCatWebhookBody({
        event: { id: "x", type: "TEST", app_user_id: "u" },
      }),
    ).toBeNull();
  });
});

describe("parseRevenueCatSubscriberResponse", () => {
  it("reads active entitlement", () => {
    const snapshot = parseRevenueCatSubscriberResponse(
      "user-1",
      {
        subscriber: {
          entitlements: {
            pro: {
              expires_date: "2099-01-01T00:00:00Z",
              product_identifier: "zelox_pro_yearly",
            },
          },
        },
      },
      "pro",
    );
    expect(snapshot?.status).toBe("active");
    expect(snapshot?.productId).toBe("zelox_pro_yearly");
  });
});
