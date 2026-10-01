"use client";

import { useLayoutEffect, type ReactNode } from "react";

import {
  activateRouteTransitionLoading,
  scheduleDeactivateRouteTransitionLoading,
} from "@/lib/ui/route-transition-loading-state";

/** Marks route-level loading UI so global chrome (legal footer) stays hidden. */
export function RouteTransitionLoadingMarker({ children }: { children: ReactNode }) {
  activateRouteTransitionLoading();

  useLayoutEffect(() => {
    activateRouteTransitionLoading();
    return () => {
      scheduleDeactivateRouteTransitionLoading();
    };
  }, []);

  return children;
}
