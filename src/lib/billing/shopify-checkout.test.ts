import { describe, expect, it } from "vitest";

import { buildShopifyMembershipCheckoutUrl } from "@/lib/billing/shopify-checkout";

describe("buildShopifyMembershipCheckoutUrl", () => {
  const userId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

  it("puts the ZeloxTag user id on the cart permalink", () => {
    const url = buildShopifyMembershipCheckoutUrl({
      storeUrl: "https://zeloxtag.myshopify.com",
      variantId: "998877",
      userId,
      email: "owner@zeloxtag.de",
    });

    expect(url).toContain("/cart/998877:1");
    expect(url).toContain("attributes%5Bsupabase_user_id%5D=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
    expect(url).toContain("checkout%5Bemail%5D=owner%40zeloxtag.de");
  });

  it("rejects a missing variant", () => {
    expect(
      buildShopifyMembershipCheckoutUrl({
        storeUrl: "https://zeloxtag.myshopify.com",
        variantId: "",
        userId,
      }),
    ).toBeNull();
  });
});
