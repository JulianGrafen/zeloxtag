"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

import {
  markWeeklyRankAwardToastShown,
  wasWeeklyRankAwardToastShown,
} from "@/lib/showcase/weekly-rank-award-toast-storage";
import { showShowcaseWeeklyRankAwardToast } from "@/lib/ui/showcase-weekly-rank-award-toast";

function shouldSkipWeeklyRankToast(pathname: string): boolean {
  return pathname === "/" || pathname.startsWith("/login");
}

export function ShowcaseWeeklyRankAwardToastListener() {
  const pathname = usePathname();
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    if (shouldSkipWeeklyRankToast(pathname)) return;

    fetchedRef.current = true;

    void fetch("/api/showcase/weekly-rank-award/pending", {
      credentials: "include",
    })
      .then(async (response) => {
        if (response.status === 401) return null;
        if (!response.ok) return null;
        const body = (await response.json()) as {
          ok?: boolean;
          pending?: {
            awardId: string;
            rank: number;
            weeklyLikes: number;
            headline: string;
            entdeckenHref: string;
          } | null;
        };
        if (!body.ok || !body.pending) return null;
        return body.pending;
      })
      .then((pending) => {
        if (!pending) return;
        if (wasWeeklyRankAwardToastShown(pending.awardId)) return;
        markWeeklyRankAwardToastShown(pending.awardId);
        showShowcaseWeeklyRankAwardToast(pending);
      })
      .catch((error) => {
        console.error("[weekly-rank-award-toast]", error);
      });
  }, [pathname]);

  useEffect(() => {
    fetchedRef.current = false;
  }, [pathname]);

  return null;
}
