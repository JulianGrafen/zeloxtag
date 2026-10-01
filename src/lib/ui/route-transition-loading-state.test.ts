import { afterEach, describe, expect, it, vi } from "vitest";

import {
  activateRouteTransitionLoading,
  isRouteTransitionLoadingActive,
  scheduleDeactivateRouteTransitionLoading,
} from "./route-transition-loading-state";

describe("routeTransitionLoadingActive", () => {
  afterEach(() => {
    vi.useRealTimers();
    scheduleDeactivateRouteTransitionLoading(0);
  });

  it("stays active until scheduled release", () => {
    vi.useFakeTimers();
    activateRouteTransitionLoading();
    expect(isRouteTransitionLoadingActive()).toBe(true);

    scheduleDeactivateRouteTransitionLoading(400);
    vi.advanceTimersByTime(399);
    expect(isRouteTransitionLoadingActive()).toBe(true);

    vi.advanceTimersByTime(1);
    expect(isRouteTransitionLoadingActive()).toBe(false);
  });

  it("cancels pending release when re-activated", () => {
    vi.useFakeTimers();
    activateRouteTransitionLoading();
    scheduleDeactivateRouteTransitionLoading(100);
    vi.advanceTimersByTime(50);

    activateRouteTransitionLoading();
    scheduleDeactivateRouteTransitionLoading(100);
    vi.advanceTimersByTime(99);
    expect(isRouteTransitionLoadingActive()).toBe(true);
  });
});
