"use client";

import { CheckCircle2, Circle } from "lucide-react";

import { MotionShineOverlay } from "@/components/billing/paywall/motion-shine-overlay";
import {
  proPaywallCardCopy,
  proPaywallPricingAnchor,
  type ProBillingInterval,
} from "@/lib/billing/pro-plan";
import type { ShinePosition } from "@/lib/hooks/use-device-motion-shine";
import { cn } from "@/lib/utils";

export function PricingCard({
  interval,
  selected,
  onSelect,
  compact = false,
  shinePosition,
  shineMotionActive = false,
}: {
  interval: ProBillingInterval;
  selected: boolean;
  onSelect: () => void;
  compact?: boolean;
  shinePosition?: ShinePosition;
  shineMotionActive?: boolean;
}) {
  if (compact) {
    const copy = proPaywallCardCopy(interval);
    const showShine = interval === "monthly" && shinePosition;

    return (
      <button
        type="button"
        role="radio"
        aria-checked={selected}
        onClick={onSelect}
        className={cn(
          "paywall-plan-row relative flex w-full origin-center items-start gap-3 overflow-hidden rounded-[12px] px-3.5 py-3 text-left will-change-transform",
          "transition-[transform,box-shadow,border-color,background-color,opacity] duration-350",
          "[transition-timing-function:var(--vd-ease-spring)]",
          selected
            ? "z-10 scale-[1.03] bg-[color:var(--paywall-pricing-selected-bg)] shadow-[var(--vd-shadow-sm)] ring-1 ring-[color:var(--paywall-pricing-selected-border)]"
            : "scale-[0.98] bg-[color:var(--paywall-grouped-bg)] opacity-95 ring-1 ring-transparent hover:scale-[1] hover:bg-[color:var(--paywall-grouped-bg-hover)] hover:opacity-100",
        )}
      >
        {showShine ? (
          <MotionShineOverlay
            position={shinePosition}
            selected={selected}
            motionActive={shineMotionActive}
          />
        ) : null}

        <span className="relative z-[1] min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-[15px] font-semibold tracking-[-0.02em] text-[color:var(--vd-text)]">
              {copy.title}
            </span>
            {copy.bestDealBadge ? (
              <span className="rounded-md bg-[color:var(--paywall-apple-blue)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.04em] text-white">
                {copy.bestDealBadge}
              </span>
            ) : null}
            {copy.discountBadge ? (
              <span className="rounded-md bg-[color:var(--paywall-apple-green)]/15 px-1.5 py-0.5 text-[10px] font-semibold text-[color:var(--paywall-apple-green)]">
                {copy.discountBadge}
              </span>
            ) : null}
          </span>

          <span
            className={cn(
              "mt-0.5 block font-semibold tracking-[-0.03em] text-[color:var(--vd-text)] transition-[font-size] duration-350 [transition-timing-function:var(--vd-ease-spring)]",
              selected ? "text-[17px]" : "text-[16px]",
            )}
          >
            {copy.primaryPrice}
          </span>

          {copy.secondaryLine ? (
            <span className="mt-0.5 block text-[13px] leading-snug text-[color:var(--vd-muted)]">
              {copy.secondaryLine}
            </span>
          ) : null}

          <span className="mt-1 block text-[13px] leading-snug text-[color:var(--vd-muted)]">
            {copy.subline}
          </span>
        </span>

        <span
          className="relative z-[1] mt-0.5 shrink-0 text-[color:var(--paywall-apple-blue)]"
          aria-hidden
        >
          {selected ? (
            <CheckCircle2 className="h-[22px] w-[22px]" strokeWidth={2} />
          ) : (
            <Circle
              className="h-[22px] w-[22px] text-[color:var(--vd-muted)]"
              strokeWidth={1.75}
            />
          )}
        </span>
      </button>
    );
  }

  const anchor = proPaywallPricingAnchor(interval);
  const title = interval === "annual" ? "Jährlich" : "Monatlich";
  const showShine = interval === "monthly" && shinePosition;

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "relative overflow-hidden rounded-2xl border px-4 py-3.5 text-left",
        selected
          ? "border-[color:var(--paywall-pricing-selected-border)] bg-[color:var(--paywall-pricing-selected-bg)] ring-2 ring-[color:var(--paywall-pricing-selected-border)]"
          : "border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)]",
      )}
    >
      {showShine ? (
        <MotionShineOverlay
          position={shinePosition}
          selected={selected}
          motionActive={shineMotionActive}
        />
      ) : null}
      <span className="relative z-[1] block text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-[color:var(--vd-muted)]">
        {title}
      </span>
      <span className="relative z-[1] mt-1 block font-semibold">{anchor.currentPrice}</span>
      {anchor.monthlyEquivalent ? (
        <span className="relative z-[1] mt-0.5 block text-[0.74rem] text-[color:var(--vd-muted)]">
          {anchor.monthlyEquivalent}
        </span>
      ) : null}
      <span className="relative z-[1] mt-2 block text-[0.72rem] font-medium text-[color:var(--paywall-pricing-trial-unselected)]">
        {anchor.trialLabel}
      </span>
    </button>
  );
}
