import { describe, expect, it } from "vitest";

import { isWebKitRenderer } from "./capture-share-card-png-file";

describe("isWebKitRenderer", () => {
  it("detects iOS Safari", () => {
    expect(
      isWebKitRenderer(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
      ),
    ).toBe(true);
  });

  it("detects Chrome on iOS (WebKit engine)", () => {
    expect(
      isWebKitRenderer(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0 Mobile/15E148 Safari/604.1",
      ),
    ).toBe(true);
  });

  it("detects Capacitor WKWebView", () => {
    expect(
      isWebKitRenderer(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
      ),
    ).toBe(true);
  });

  it("excludes desktop and Android Chrome", () => {
    expect(
      isWebKitRenderer(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36",
      ),
    ).toBe(false);
    expect(
      isWebKitRenderer(
        "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36",
      ),
    ).toBe(false);
  });
});
