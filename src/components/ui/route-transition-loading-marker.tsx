"use client";

import { useLayoutEffect, type ReactNode } from "react";

import { setRouteTransitionLoadingActive } from "@/lib/ui/route-transition-loading-state";

/** Marks route-level loading UI so global chrome (legal footer) stays hidden. */
export function RouteTransitionLoadingMarker({ children }: { children: ReactNode }) {
  setRouteTransitionLoadingActive(true);

  useLayoutEffect(() => {
    setRouteTransitionLoadingActive(true);
    return () => setRouteTransitionLoadingActive(false);
  }, []);

  return children;
}
