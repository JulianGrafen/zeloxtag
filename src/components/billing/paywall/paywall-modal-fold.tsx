"use client";

import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/utils";

const BENEFIT_MASK =
  "linear-gradient(to bottom, black 0%, black 55%, transparent 100%)";

type PaywallModalFoldProps = {
  benefits: ReactNode;
  pricing: ReactNode;
  timeline: ReactNode;
  footer?: ReactNode;
  className?: string;
};

/**
 * Modal paywall: benefits fill the area up to 33dvh, then pricing and timeline
 * in document flow (no bottom overlay).
 */
export function PaywallModalFold({
  benefits,
  pricing,
  timeline,
  footer,
  className,
}: PaywallModalFoldProps) {
  const benefitMaskStyle = {
    "--paywall-benefit-mask": BENEFIT_MASK,
  } as CSSProperties;

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      <div
        className={cn(
          "shrink-0 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]",
          "[mask-image:var(--paywall-benefit-mask)]",
          "[-webkit-mask-image:var(--paywall-benefit-mask)]",
          "[mask-size:100%_100%]",
          "[-webkit-mask-size:100%_100%]",
        )}
        style={{
          ...benefitMaskStyle,
          height: "calc(33dvh - 5.75rem)",
        }}
        aria-label="Vorteile scrollen"
      >
        {benefits}
      </div>

      <div className="shrink-0 bg-gradient-to-t from-[color:var(--vd-surface)] from-60% pt-1">
        {pricing}
      </div>
      <div className="shrink-0">{timeline}</div>
      {footer ? <div className="shrink-0">{footer}</div> : null}
    </div>
  );
}
