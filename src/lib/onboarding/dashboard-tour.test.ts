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
    expect(owner.length).toBe(8);
    expect(owner.some((step) => step.id === "scan")).toBe(true);
    expect(owner.some((step) => step.id === "timeline")).toBe(true);
    expect(owner.some((step) => step.id === "werkstatt")).toBe(true);
    expect(owner.some((step) => step.id === "showcase")).toBe(true);
    expect(owner.some((step) => step.id === "account")).toBe(true);
    expect(contributor.some((step) => step.id === "scan")).toBe(true);
    expect(contributor.some((step) => step.id === "timeline")).toBe(true);
    expect(owner[0]?.id).toBe("welcome");
    expect(owner.at(-1)?.id).toBe("account");
  });

  it("treats missing window as completed to avoid SSR flash", () => {
    vi.unstubAllGlobals();
    expect(hasCompletedDashboardTour()).toBe(true);
  });
});

describe("first-registration tour URLs", () => {
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

  it("detects explicit tour flag only (not Stripe success)", () => {
    expect(isForcedDashboardTourSearch({ tour: "1" })).toBe(true);
    expect(isForcedDashboardTourSearch({ tour: "0" })).toBe(false);
    expect(isPostPaymentReturn({ checkout: "success" })).toBe(true);
    expect(isPostPaymentReturn({ session_id: "cs_test_123" })).toBe(true);
    expect(isPostPaymentReturn({ checkout: "cancel" })).toBe(false);
  });
});
