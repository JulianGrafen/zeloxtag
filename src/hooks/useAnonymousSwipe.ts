"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  ANONYMOUS_SWIPE_GATE_LIMIT,
  hashAnonymousSessionId,
  loadAnonymousSwipeStorage,
  saveAnonymousSwipeStorage,
  type AnonymousSwipeStorageState,
} from "@/lib/public-swipe/anonymous-swipe-storage";
import {
  mapRegisterAnonymousSwipeResult,
  type RegisterAnonymousSwipeResult,
} from "@/lib/public-swipe/public-swipe-card-map";

export type AnonymousVoteType = "up" | "down";

export function useAnonymousSwipe() {
  const [state, setState] = useState<AnonymousSwipeStorageState | null>(null);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    const loaded = loadAnonymousSwipeStorage();
    setState(loaded);

    const syncCalendarWeek = () => {
      setState((current) => {
        if (!current) return current;
        return saveAnonymousSwipeStorage(current);
      });
    };
    window.addEventListener("focus", syncCalendarWeek);
    document.addEventListener("visibilitychange", syncCalendarWeek);

    void (async () => {
      if (loaded.sessionHash) {
        setSessionReady(true);
        return;
      }
      try {
        const sessionHash = await hashAnonymousSessionId(loaded.sessionId);
        const next = saveAnonymousSwipeStorage({ ...loaded, sessionHash });
        setState(next);
      } catch (error) {
        console.error("[useAnonymousSwipe] session hash failed", error);
      } finally {
        setSessionReady(true);
      }
    })();

    return () => {
      window.removeEventListener("focus", syncCalendarWeek);
      document.removeEventListener("visibilitychange", syncCalendarWeek);
    };
  }, []);

  const isGated = (state?.swipeCount ?? 0) >= ANONYMOUS_SWIPE_GATE_LIMIT;

  const swipedCarIds = useMemo(
    () => state?.swipedCarIds ?? [],
    [state?.swipedCarIds],
  );

  const recordSwipe = useCallback(
    async (
      carId: string,
      voteType: AnonymousVoteType,
    ): Promise<RegisterAnonymousSwipeResult | null> => {
      if (!state?.sessionHash) return null;
      if (state.swipedCarIds.includes(carId)) return null;

      const response = await fetch("/api/public/swipe", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId: carId,
          voteType,
          clientSessionHash: state.sessionHash,
        }),
      });

      if (!response.ok) return null;

      const body = (await response.json()) as {
        ok?: boolean;
        result?: unknown;
      };
      if (!body.ok) return null;

      const mapped = mapRegisterAnonymousSwipeResult(body.result);
      if (!mapped) return null;

      setState((current) => {
        if (!current) return current;
        if (current.swipedCarIds.includes(carId)) return current;
        return saveAnonymousSwipeStorage({
          ...current,
          swipedCarIds: [...current.swipedCarIds, carId],
          swipeCount: current.swipeCount + 1,
        });
      });

      return mapped;
    },
    [state],
  );

  return {
    sessionReady,
    sessionHash: state?.sessionHash ?? null,
    calendarWeekKey: state?.calendarWeekKey ?? "",
    swipedCarIds,
    swipeCount: state?.swipeCount ?? 0,
    isGated,
    recordSwipe,
  };
}
