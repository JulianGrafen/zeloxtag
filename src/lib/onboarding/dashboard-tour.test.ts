import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  DASHBOARD_TOUR_STORAGE_KEY,
  dashboardTourHref,
  getDashboardTourSteps,
  hasCompletedDashboardTour,
  isForcedDashboardTourSearch,
  isPostPaymentReturn,
  markDashboardTourCompleted,
  resetDashboardTour,
  withForcedDashboardTour,
} from "@/lib/onboarding/dashboard-tour";

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
  resetDashboardTour();
});

afterEach(() => {
  resetDashboardTour();
  vi.unstubAllGlobals();
});

describe("dashboard tour persistence", () => {
  it("starts incomplete and completes after mark", () => {
    expect(hasCompletedDashboardTour()).toBe(false);
    markDashboardTourCompleted();
    expect(hasCompletedDashboardTour()).toBe(true);
    expect(localStorage.getItem(DASHBOARD_TOUR_STORAGE_KEY)).toContain(
      '"done":true',
    );
  });

  it("provides owner and contributor catalogs", () => {
    const owner = getDashboardTourSteps("owner");
    const contributor = getDashboardTourSteps("contributor");
    expect(owner.some((step) => step.id === "schrauber")).toBe(true);
    expect(contributor.some((step) => step.id === "schrauber")).toBe(false);
    expect(owner[0]?.id).toBe("welcome");
    expect(owner.at(-1)?.id).toBe("done");
  });

  it("treats missing window as completed to avoid SSR flash", () => {
    vi.unstubAllGlobals();
    expect(hasCompletedDashboardTour()).toBe(true);
  });
});

describe("post-payment tour URLs", () => {
  it("builds a dashboard tour href without opening the scanner", () => {
    const href = dashboardTourHref("8f3a9b2c-1a2b-4c3d-8e9f-0a1b2c3d4e5f");
    expect(href).toBe(
      "/v/8f3a9b2c-1a2b-4c3d-8e9f-0a1b2c3d4e5f?tour=1",
    );
    expect(href).not.toContain("scan=");
  });

  it("rewrites a scanner return path into a tour path", () => {
    expect(
      withForcedDashboardTour(
        "/v/8f3a9b2c-1a2b-4c3d-8e9f-0a1b2c3d4e5f?scan=1&type=invoice",
      ),
    ).toBe("/v/8f3a9b2c-1a2b-4c3d-8e9f-0a1b2c3d4e5f?tour=1");
  });

  it("detects Stripe success and explicit tour flags", () => {
    expect(isForcedDashboardTourSearch({ tour: "1" })).toBe(true);
    expect(isForcedDashboardTourSearch({ checkout: "success" })).toBe(true);
    expect(isForcedDashboardTourSearch({ checkout: "cancel" })).toBe(false);
    expect(isPostPaymentReturn({ session_id: "cs_test_123" })).toBe(true);
    expect(isPostPaymentReturn({ checkout: "cancel" })).toBe(false);
  });
});
