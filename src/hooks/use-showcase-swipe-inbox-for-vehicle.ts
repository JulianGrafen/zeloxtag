"use client";

import { useCallback, useEffect, useState } from "react";

import { apiFetch } from "@/lib/api/api-fetch";

type InboxCounts = {
  totalLikes: number;
  unreadLikes: number;
};

type InboxRow = {
  vehicle_id?: string;
  total_likes?: number;
  unread_likes?: number;
};

function parseInboxRow(
  rows: unknown,
  vehicleId: string,
): InboxCounts | null {
  if (!Array.isArray(rows)) return null;
  for (const entry of rows) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as InboxRow;
    if (row.vehicle_id !== vehicleId) continue;
    return {
      totalLikes:
        typeof row.total_likes === "number"
          ? Math.max(0, Math.floor(row.total_likes))
          : 0,
      unreadLikes:
        typeof row.unread_likes === "number"
          ? Math.max(0, Math.floor(row.unread_likes))
          : 0,
    };
  }
  return null;
}

/**
 * Keeps build-swipe like counts fresh on the dashboard (focus + interval).
 */
export function useShowcaseSwipeInboxForVehicle(
  vehicleId: string,
  initial: InboxCounts,
  enabled: boolean,
): InboxCounts {
  const [counts, setCounts] = useState(initial);

  useEffect(() => {
    setCounts(initial);
  }, [initial.totalLikes, initial.unreadLikes, vehicleId]);

  const refresh = useCallback(async () => {
    if (!enabled || !vehicleId.trim()) return;
    try {
      const response = await apiFetch("/api/showcase/swipe/inbox");
      if (!response.ok) return;
      const payload = (await response.json()) as {
        ok?: boolean;
        rows?: unknown;
      };
      if (!payload.ok) return;
      const next = parseInboxRow(payload.rows, vehicleId);
      if (next) setCounts(next);
    } catch {
      // ignore — stale server props are fine
    }
  }, [enabled, vehicleId]);

  useEffect(() => {
    if (!enabled) return;

    void refresh();

    const onFocus = () => {
      void refresh();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);

    const intervalId = window.setInterval(() => {
      void refresh();
    }, 45_000);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
      window.clearInterval(intervalId);
    };
  }, [enabled, refresh]);

  return counts;
}
