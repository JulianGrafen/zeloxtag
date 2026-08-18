import { describe, expect, it } from "vitest";

import {
  extractUnguessableOrderSecret,
  isUnguessableOrderSecret,
  membershipLineItemProductId,
  normalizeMembershipEmail,
  parseMembershipProductIds,
  parseShopifyMembershipAction,
} from "@/lib/billing/shopify-membership";

const PRODUCT_ID = "16100879925573";
const PRODUCT_IDS = parseMembershipProductIds(PRODUCT_ID);

const ORDER_TOKEN = "a1b2c3d4e5f6789012345678abcd9012";

const paidOrder = {
  id: 8899,
  name: "#1001",
  order_number: 1001,
  token: ORDER_TOKEN,
  email: "owner@zeloxtag.de",
  customer: { id: 44, email: "owner@zeloxtag.de" },
  processed_at: "2026-08-17T16:00:00Z",
  line_items: [{ product_id: Number(PRODUCT_ID), title: "Mitgliedschaft" }],
  note_attributes: [{ name: "supabase_user_id", value: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" }],
};

describe("parseMembershipProductIds", () => {
  it("accepts numeric ids and Shopify GIDs", () => {
    expect(
      parseMembershipProductIds(` ${PRODUCT_ID}, gid://shopify/Product/${PRODUCT_ID} `),
    ).toEqual(new Set([PRODUCT_ID]));
  });
});

describe("parseShopifyMembershipAction", () => {
  it("activates on orders/paid when the membership product is in the cart", () => {
    const action = parseShopifyMembershipAction("orders/paid", paidOrder, PRODUCT_IDS);
    expect(action).toMatchObject({
      status: "active",
      email: "owner@zeloxtag.de",
      userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      shopifyOrderId: "8899",
      shopifyOrderName: "#1001",
      shopifyOrderNumber: "1001",
      shopifyOrderToken: ORDER_TOKEN,
      shopifyProductId: PRODUCT_ID,
    });
    expect(action?.currentPeriodEnd).toBe("2026-09-17T16:00:00.000Z");
  });

  it("ignores paid orders that do not contain the membership product", () => {
    expect(
      parseShopifyMembershipAction(
        "orders/paid",
        { ...paidOrder, line_items: [{ product_id: 1 }] },
        PRODUCT_IDS,
      ),
    ).toBeNull();
  });

  it("reads the user id from line-item properties when emails differ", () => {
    const action = parseShopifyMembershipAction(
      "orders/paid",
      {
        id: 1,
        email: "shop@paypal.example",
        line_items: [
          {
            product_id: Number(PRODUCT_ID),
            properties: [{ name: "supabase_user_id", value: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" }],
          },
        ],
      },
      PRODUCT_IDS,
    );
    expect(action?.userId).toBe("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb");
  });

  it("cancels when the membership order is cancelled", () => {
    expect(
      parseShopifyMembershipAction("orders/cancelled", paidOrder, PRODUCT_IDS)?.status,
    ).toBe("canceled");
  });

  it("marks failed subscription billing as past_due", () => {
    expect(
      parseShopifyMembershipAction(
        "subscription_billing_attempts/failure",
        { email: "owner@zeloxtag.de" },
        PRODUCT_IDS,
      )?.status,
    ).toBe("past_due");
  });
});

describe("membershipLineItemProductId", () => {
  it("reads product_id from line items", () => {
    expect(membershipLineItemProductId(paidOrder, PRODUCT_IDS)).toBe(PRODUCT_ID);
  });
});

describe("normalizeMembershipEmail", () => {
  it("normalizes a checkout email", () => {
    expect(normalizeMembershipEmail("  Owner@ZeloxTag.de ")).toBe(
      "owner@zeloxtag.de",
    );
  });

  it("rejects empty or malformed values", () => {
    expect(normalizeMembershipEmail("1001")).toBeNull();
    expect(normalizeMembershipEmail("not-an-email")).toBeNull();
    expect(normalizeMembershipEmail("")).toBeNull();
  });
});

describe("extractUnguessableOrderSecret", () => {
  it("rejects sequential order numbers", () => {
    expect(extractUnguessableOrderSecret("1001")).toBeNull();
    expect(extractUnguessableOrderSecret("#1001")).toBeNull();
    expect(extractUnguessableOrderSecret("1002")).toBeNull();
    expect(isUnguessableOrderSecret("1001")).toBe(false);
  });

  it("rejects Shopify numeric ids even when long", () => {
    expect(extractUnguessableOrderSecret("5890123456789")).toBeNull();
  });

  it("accepts a raw Shopify order token", () => {
    expect(extractUnguessableOrderSecret(ORDER_TOKEN)).toBe(ORDER_TOKEN);
  });

  it("reads order.token from a Shopify status-page URL", () => {
    const url = `https://shop.myshopify.com/1234567890/orders/${ORDER_TOKEN}/authenticate?key=othersecretkeyvalue1`;
    expect(extractUnguessableOrderSecret(url)).toBe(ORDER_TOKEN);
  });

  it("reads claim or token from a ZeloxTag settings URL", () => {
    expect(
      extractUnguessableOrderSecret(
        `https://app.zeloxtag.de/settings?claim=${ORDER_TOKEN}`,
      ),
    ).toBe(ORDER_TOKEN);
    expect(
      extractUnguessableOrderSecret(
        `https://app.zeloxtag.de/settings?token=${ORDER_TOKEN}`,
      ),
    ).toBe(ORDER_TOKEN);
  });

  it("falls back to order_status_url when payload.token is missing", () => {
    const action = parseShopifyMembershipAction(
      "orders/paid",
      {
        ...paidOrder,
        token: undefined,
        order_status_url: `https://shop.myshopify.com/1/orders/${ORDER_TOKEN}/authenticate?key=nottheordersecret01`,
      },
      PRODUCT_IDS,
    );
    expect(action?.shopifyOrderToken).toBe(ORDER_TOKEN);
  });
});
