"use client";

import { useEffect } from "react";

import { TAG_SCAN_CLIENT_DEDUPE_MS } from "@/lib/tags/tag-scan-notify";

const STORAGE_PREFIX = "zlx-tag-scan-beacon:";

/**
 * Reports a guest QR scan for Live-Scan notifications. Runs only in a real
 * browser (link-preview bots don't execute JS) and once per tab per window.
 */
export function TagScanBeacon({ tagUuid }: { tagUuid: string }) {
  useEffect(() => {
    const key = `${STORAGE_PREFIX}${tagUuid}`;
    try {
      const last = Number(sessionStorage.getItem(key));
      if (Number.isFinite(last) && Date.now() - last < TAG_SCAN_CLIENT_DEDUPE_MS) {
        return;
      }
      sessionStorage.setItem(key, String(Date.now()));
    } catch {
      // Private mode without storage: server-side dedupe still applies.
    }

    void fetch("/api/public/tag-scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tagUuid }),
      keepalive: true,
      credentials: "same-origin",
    }).catch(() => undefined);
  }, [tagUuid]);

  return null;
}
