import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  hasSeenProductFeaturesBanner,
  markProductFeaturesBannerSeen,
  PRODUCT_FEATURES_BANNER_STORAGE_KEY,
  resetProductFeaturesBanner,
} from "@/lib/ui/product-features-banner";

function installMemoryLocalStorage() {
  const store = new Map<string, string>();
  const localStorageMock = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
  };

  vi.stubGlobal("window", { localStorage: localStorageMock });
  vi.stubGlobal("localStorage", localStorageMock);
}

beforeEach(() => {
  installMemoryLocalStorage();
  resetProductFeaturesBanner();
});

afterEach(() => {
  resetProductFeaturesBanner();
  vi.unstubAllGlobals();
});

describe("product features banner persistence", () => {
  it("starts unseen and marks seen once", () => {
    expect(hasSeenProductFeaturesBanner()).toBe(false);
    markProductFeaturesBannerSeen();
    expect(hasSeenProductFeaturesBanner()).toBe(true);
    expect(localStorage.getItem(PRODUCT_FEATURES_BANNER_STORAGE_KEY)).toContain(
      '"seen":true',
    );
  });
});
