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
import { IOS_CARD, IconBadge } from "@/components/ui/ios";
import { cn } from "@/lib/utils";

type ProductFeaturesBannerProps = {
  discoverHref: string;
  costsHref: string;
  /** When false, wait before showing (e.g. onboarding tour). */
  active?: boolean;
  className?: string;
};

export function ProductFeaturesBanner({
  discoverHref,
  costsHref,
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

  return (
    <div
      role="status"
      className={cn(
        IOS_CARD,
        "vd-anim-header relative px-4 py-3.5",
        className,
      )}
    >
      <div className="relative flex items-start gap-3">
        <IconBadge icon={Sparkles} tone="purple" className="mt-0.5" />
        <div className="min-w-0 flex-1 space-y-2 pr-6">
          <p className="text-[15px] font-semibold text-white">
            Neu: Build-Swipe & Kostenübersicht
          </p>
          <ul className="space-y-1.5 text-[13px] leading-relaxed text-[#8E8E93]">
            <li>
              <Link
                href={discoverHref}
                className="font-medium text-[#0A84FF]"
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
                className="font-medium text-[#0A84FF]"
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
          className="absolute right-1 top-1 inline-flex h-8 w-8 items-center justify-center rounded-full text-[#8E8E93] hover:bg-white/[0.08] hover:text-white"
          aria-label="Hinweis schließen"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
