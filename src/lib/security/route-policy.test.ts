import { describe, expect, it } from "vitest";

import { AUFLAGEN_KUERZEL_IMAGE_API_PATH } from "@/lib/documents/constants";
import {
  SHOPIFY_WEBHOOK_API_PATH,
  STRIPE_WEBHOOK_API_PATH,
} from "@/lib/billing/constants";

import {
  isProtectedApiPath,
  isProtectedPagePath,
  isProtectedVehicleTagSubPath,
  isPublicPath,
  isPublicVehicleImagePath,
  loginRedirectUrl,
} from "./route-policy";

describe("isProtectedPagePath", () => {
  it("requires auth for digital garage routes", () => {
    expect(isProtectedPagePath("/garage")).toBe(true);
    expect(
      isProtectedPagePath(
        "/garage/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      ),
    ).toBe(true);
  });
});

describe("loginRedirectUrl", () => {
  it("uses home login with next param", () => {
    const url = loginRedirectUrl(
      "https://app.zeloxtag.de",
      "/garage/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "",
    );
    expect(url).toBe(
      "https://app.zeloxtag.de/?next=%2Fgarage%2Faaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    );
  });
});

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

  it("allows well-known app link verification", () => {
    expect(
      isPublicPath("/.well-known/apple-app-site-association"),
    ).toBe(true);
    expect(isPublicPath("/.well-known/assetlinks.json")).toBe(true);
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
