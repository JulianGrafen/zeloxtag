"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Sparkles, X } from "lucide-react";

import {
  hasSeenProductFeaturesBanner,
  markProductFeaturesBannerSeen,
  PRODUCT_FEATURES_BANNER_AUTO_DISMISS_MS,
  PRODUCT_FEATURES_BANNER_SHOW_DELAY_MS,
} from "@/lib/ui/product-features-banner";
import { cn } from "@/lib/utils";

type ProductFeaturesBannerProps = {
  tagUuid: string;
  /** When false, wait before showing (e.g. onboarding tour). */
  active?: boolean;
  className?: string;
};

export function ProductFeaturesBanner({
  tagUuid,
  active = true,
  className,
}: ProductFeaturesBannerProps) {
  const [visible, setVisible] = useState(false);
  const dismissTimerRef = useRef<number | null>(null);
  const showTimerRef = useRef<number | null>(null);

  function clearTimers() {
    if (dismissTimerRef.current != null) {
      window.clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
    if (showTimerRef.current != null) {
      window.clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
  }

  function dismiss(persist = true) {
    clearTimers();
    if (persist) {
      markProductFeaturesBannerSeen();
    }
    setVisible(false);
  }

  useEffect(() => {
    clearTimers();
    if (!active) return;

    if (hasSeenProductFeaturesBanner()) {
      return;
    }

    showTimerRef.current = window.setTimeout(() => {
      if (hasSeenProductFeaturesBanner()) return;
      setVisible(true);
      dismissTimerRef.current = window.setTimeout(
        () => dismiss(true),
        PRODUCT_FEATURES_BANNER_AUTO_DISMISS_MS,
      );
    }, PRODUCT_FEATURES_BANNER_SHOW_DELAY_MS);

    return () => {
      clearTimers();
    };
  }, [active]);

  if (!visible) return null;

  const discoverHref = `/v/${tagUuid}/entdecken`;
  const costsHref = `/v/${tagUuid}/dokumente/kosten`;

  return (
    <div
      role="status"
      className={cn(
        "vd-anim-header relative overflow-hidden rounded-[1.25rem] border border-[color:var(--vd-accent)]/25 bg-[color:var(--vd-surface)] px-4 py-3.5 shadow-[0_0_32px_-12px_color-mix(in_srgb,var(--vd-accent)_45%,transparent)] ring-1 ring-[color:var(--vd-border)]",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[color:var(--vd-accent)]/[0.07] via-transparent to-transparent"
      />
      <div className="relative flex items-start gap-3">
        <span
          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[color:var(--vd-accent)]/12 text-[color:var(--vd-accent)]"
          aria-hidden
        >
          <Sparkles className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1 space-y-2 pr-6">
          <p className="text-[0.82rem] font-semibold tracking-[-0.02em] text-[color:var(--vd-text)]">
            Neu: Build-Swipe & Kostenübersicht
          </p>
          <ul className="space-y-1.5 text-[0.78rem] leading-relaxed text-[color:var(--vd-muted)]">
            <li>
              <Link
                href={discoverHref}
                className="font-medium text-[color:var(--vd-text)] underline decoration-[color:var(--vd-accent)]/40 underline-offset-2 hover:decoration-[color:var(--vd-accent)]"
                onClick={() => dismiss(true)}
              >
                Entdecken
              </Link>
              {" — "}
              öffentliche Builds per Swipe durchstöbern und liken.
            </li>
            <li>
              <Link
                href={costsHref}
                className="font-medium text-[color:var(--vd-text)] underline decoration-[color:var(--vd-accent)]/40 underline-offset-2 hover:decoration-[color:var(--vd-accent)]"
                onClick={() => dismiss(true)}
              >
                Kostenübersicht
              </Link>
              {" — "}
              Investition, Umbau- und Wartungskosten aus deinen Belegen.
            </li>
          </ul>
        </div>
        <button
          type="button"
          onClick={() => dismiss(true)}
          className="absolute right-1 top-1 inline-flex h-8 w-8 items-center justify-center rounded-full text-[color:var(--vd-muted)] hover:bg-[color:var(--vd-surface-elevated)] hover:text-[color:var(--vd-text)]"
          aria-label="Hinweis schließen"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
