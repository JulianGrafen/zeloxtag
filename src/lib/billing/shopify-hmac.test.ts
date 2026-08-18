import { createHmac } from "crypto";
import { describe, expect, it } from "vitest";

import {
  shopMatchesAllowlist,
  verifyShopifyHmac,
} from "@/lib/billing/shopify-hmac";

describe("verifyShopifyHmac", () => {
  const secret = "whsec_test";
  const body = '{"id":1}';
  const header = createHmac("sha256", secret).update(body, "utf8").digest("base64");

  it("accepts a matching Shopify HMAC header", () => {
    expect(verifyShopifyHmac(body, header, secret)).toBe(true);
  });

  it("rejects a tampered body", () => {
    expect(verifyShopifyHmac('{"id":2}', header, secret)).toBe(false);
  });

  it("rejects missing header or secret", () => {
    expect(verifyShopifyHmac(body, null, secret)).toBe(false);
    expect(verifyShopifyHmac(body, header, "")).toBe(false);
  });
});

describe("shopMatchesAllowlist", () => {
  it("allows any shop when no allowlist is set", () => {
    expect(shopMatchesAllowlist("zeloxtag.myshopify.com", null)).toBe(true);
  });

  it("requires an exact shop domain when configured", () => {
    expect(
      shopMatchesAllowlist("zeloxtag.myshopify.com", "zeloxtag.myshopify.com"),
    ).toBe(true);
    expect(shopMatchesAllowlist("other.myshopify.com", "zeloxtag")).toBe(false);
    expect(shopMatchesAllowlist("zeloxtag.myshopify.com", "zeloxtag")).toBe(true);
  });
});
