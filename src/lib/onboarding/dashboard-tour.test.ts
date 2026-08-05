import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  DASHBOARD_TOUR_STORAGE_KEY,
  getDashboardTourSteps,
  hasCompletedDashboardTour,
  markDashboardTourCompleted,
  resetDashboardTour,
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
