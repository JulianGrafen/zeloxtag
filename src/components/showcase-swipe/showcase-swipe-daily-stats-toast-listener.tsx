"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import {
  markShowcaseDailyStatsToastShownToday,
  wasShowcaseDailyStatsToastShownToday,
} from "@/lib/showcase/showcase-daily-stats-toast-storage";
import { mapVehicleShowcaseSwipeDailyStatsRow } from "@/lib/showcase/vehicle-showcase-swipe-daily-stats-map";
import { showShowcaseSwipeDailyStatsToast } from "@/lib/ui/showcase-swipe-daily-stats-toast";

function shouldSkipDailyStatsToast(pathname: string): boolean {
  if (pathname === "/" || pathname.startsWith("/login")) return true;
  if (pathname.endsWith("/entdecken")) return true;
  return false;
}

export function ShowcaseSwipeDailyStatsToastListener() {
  const pathname = usePathname();

  useEffect(() => {
    if (shouldSkipDailyStatsToast(pathname)) return;
    if (wasShowcaseDailyStatsToastShownToday()) return;

    let cancelled = false;

    void fetch("/api/showcase/swipe/daily-stats", { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) return null;
        const body = (await response.json()) as {
          ok?: boolean;
          stats?: unknown;
        };
        if (!body.ok || !body.stats) return null;
        return mapVehicleShowcaseSwipeDailyStatsRow(body.stats);
      })
      .then((stats) => {
        if (cancelled || !stats) return;
        if (wasShowcaseDailyStatsToastShownToday()) return;
        markShowcaseDailyStatsToastShownToday();
        showShowcaseSwipeDailyStatsToast(stats);
      })
      .catch((error) => {
        console.error("[showcase-daily-stats-toast]", error);
      });

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return null;
}
