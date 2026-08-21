import { describe, expect, it } from "vitest";

import { AUFLAGEN_KUERZEL_IMAGE_API_PATH } from "@/lib/documents/constants";
import {
  SHOPIFY_WEBHOOK_API_PATH,
  STRIPE_WEBHOOK_API_PATH,
} from "@/lib/billing/constants";

import {
  isProtectedApiPath,
  isProtectedVehicleTagSubPath,
  isPublicPath,
  isPublicVehicleImagePath,
} from "./route-policy";

describe("isProtectedVehicleTagSubPath", () => {
  it("requires auth for owner sub-routes but keeps QR landing public", () => {
    expect(isProtectedVehicleTagSubPath("/v/zlx-abc123")).toBe(false);
    expect(isProtectedVehicleTagSubPath("/v/zlx-abc123/dokumente")).toBe(true);
    expect(isProtectedVehicleTagSubPath("/v/zlx-abc123/einstellungen")).toBe(
      true,
    );
    expect(
      isProtectedVehicleTagSubPath("/v/zlx-abc123/opengraph-image"),
    ).toBe(false);
    expect(isProtectedVehicleTagSubPath("/v/demo-active-tag/dokumente")).toBe(
      false,
    );
  });
});

describe("isPublicPath", () => {
  it("allows token-gated exposé URLs and keeps owner APIs protected", () => {
    expect(
      isPublicPath("/expose/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"),
    ).toBe(true);
    expect(isPublicPath("/v/demo-active-tag")).toBe(true);
    expect(isPublicPath("/dashboard")).toBe(false);
  });
});

describe("auflagen kuerzel image GET", () => {
  it("is public media so <img> is not blocked by session or MFA", () => {
    expect(
      isPublicVehicleImagePath(AUFLAGEN_KUERZEL_IMAGE_API_PATH, "GET"),
    ).toBe(true);
    expect(isProtectedApiPath(AUFLAGEN_KUERZEL_IMAGE_API_PATH, "GET")).toBe(
      false,
    );
    expect(isProtectedApiPath(AUFLAGEN_KUERZEL_IMAGE_API_PATH, "POST")).toBe(
      true,
    );
    expect(isProtectedApiPath("/api/abe/auflagen-kuerzel", "GET")).toBe(true);
  });
});

describe("shopify membership webhook POST", () => {
  it("is public so Shopify can deliver without a ZeloxTag session", () => {
    expect(isProtectedApiPath(SHOPIFY_WEBHOOK_API_PATH, "POST")).toBe(false);
    expect(isProtectedApiPath(SHOPIFY_WEBHOOK_API_PATH, "GET")).toBe(true);
  });
});

describe("stripe membership webhook POST", () => {
  it("is public so Stripe can deliver without a ZeloxTag session", () => {
    expect(isProtectedApiPath(STRIPE_WEBHOOK_API_PATH, "POST")).toBe(false);
    expect(isProtectedApiPath(STRIPE_WEBHOOK_API_PATH, "GET")).toBe(true);
  });
});
