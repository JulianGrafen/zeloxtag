import { describe, expect, it } from "vitest";

import {
  detectEmbeddedSocialWebView,
  detectPlatformSnapshot,
  PlatformService,
} from "@/services/platform/platform-service";

describe("detectEmbeddedSocialWebView", () => {
  it("detects Instagram in-app browser", () => {
    expect(
      detectEmbeddedSocialWebView(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Instagram 300.0.0.0",
      ),
    ).toBe(true);
  });

  it("detects TikTok / Bytedance webview", () => {
    expect(
      detectEmbeddedSocialWebView(
        "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 TikTok 32.0",
      ),
    ).toBe(true);
    expect(
      detectEmbeddedSocialWebView(
        "Mozilla/5.0 (Linux; Android 13) BytedanceWebview/1.0",
      ),
    ).toBe(true);
  });

  it("returns false for Safari", () => {
    expect(
      detectEmbeddedSocialWebView(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Version/17.0 Mobile/15E148 Safari/604.1",
      ),
    ).toBe(false);
  });
});

describe("PlatformService", () => {
  it("exposes isNativePlatform as alias for isNativeApp", () => {
    const service = new PlatformService({
      isNativeApp: true,
      platform: "ios",
      isEmbeddedSocialWebView: false,
      canUseStripeCheckout: false,
    });
    expect(service.isNativePlatform).toBe(true);
    expect(service.isNativeApp).toBe(true);
  });
});

describe("detectPlatformSnapshot", () => {
  it("marks Capacitor iOS as native without Stripe checkout", () => {
    const snapshot = detectPlatformSnapshot({
      userAgent: "Capacitor iOS",
      isNativePlatform: true,
      nativePlatform: "ios",
    });
    expect(snapshot.isNativeApp).toBe(true);
    expect(snapshot.platform).toBe("ios");
    expect(snapshot.canUseStripeCheckout).toBe(false);
    expect(snapshot.isEmbeddedSocialWebView).toBe(false);
  });

  it("keeps Stripe on normal mobile web", () => {
    const snapshot = detectPlatformSnapshot({
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Version/17.0 Mobile/15E148 Safari/604.1",
      isNativePlatform: false,
      nativePlatform: "web",
    });
    expect(snapshot.canUseStripeCheckout).toBe(true);
    expect(snapshot.isEmbeddedSocialWebView).toBe(false);
  });

  it("flags Instagram webview but keeps Stripe path", () => {
    const snapshot = detectPlatformSnapshot({
      userAgent: "Instagram 300.0.0.0",
      isNativePlatform: false,
      nativePlatform: "web",
    });
    expect(snapshot.isEmbeddedSocialWebView).toBe(true);
    expect(snapshot.canUseStripeCheckout).toBe(true);
  });
});
