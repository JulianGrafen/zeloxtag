"use client";

import { MotionShineOverlay } from "@/components/billing/paywall/motion-shine-overlay";
import {
  PRO_ANNUAL_DISCOUNT_LABEL,
  PRO_ANNUAL_RECOMMENDED_LABEL,
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
  const anchor = proPaywallPricingAnchor(interval);
  const title = interval === "annual" ? "Jährlich" : "Monatlich";
  const badge = interval === "annual" ? PRO_ANNUAL_RECOMMENDED_LABEL : undefined;

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "relative overflow-hidden rounded-2xl border text-left",
        "origin-center will-change-transform",
        "transition-[transform,box-shadow,border-color,background-color,opacity] duration-350",
        "[transition-timing-function:var(--vd-ease-spring)]",
        compact ? (selected ? "px-3.5 py-3.5" : "px-3 py-3") : "px-4 py-3.5",
        selected
          ? "z-10 scale-[1.06] border-[color:var(--paywall-pricing-selected-border)] bg-[color:var(--paywall-pricing-selected-bg)] text-[color:var(--vd-text)] ring-2 ring-[color:var(--paywall-pricing-selected-border)] shadow-[var(--vd-shadow)]"
          : "scale-[0.97] border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)] text-[color:var(--vd-text)] opacity-90 hover:scale-[0.99] hover:border-[color:var(--paywall-pricing-hover-border)] hover:opacity-100",
      )}
    >
      {interval === "monthly" && shinePosition ? (
        <MotionShineOverlay
          position={shinePosition}
          selected={selected}
          motionActive={shineMotionActive}
        />
      ) : null}

      <div className="relative z-[1]">
      {badge ? (
        <div
          className={cn(
            "mb-1.5 flex flex-wrap items-center gap-1.5",
            compact ? "mb-1.5" : "mb-2",
          )}
        >
          <span
            className={cn(
              "inline-flex rounded-full px-2 py-0.5 font-semibold uppercase tracking-[0.08em]",
              compact ? "text-[0.58rem]" : "text-[0.62rem]",
              selected
                ? "bg-[color:var(--paywall-badge-primary-bg)] text-white"
                : "bg-[color:var(--paywall-badge-neutral-bg)] text-[color:var(--primary-foreground)]",
            )}
          >
            {compact ? "Beliebteste Wahl" : badge}
          </span>
          {interval === "annual" ? (
            <span
              className={cn(
                "inline-flex rounded-full px-2.5 py-0.5 font-semibold uppercase tracking-[0.06em]",
                compact ? "text-[0.64rem]" : "text-[0.7rem]",
                selected
                  ? "bg-[color:var(--paywall-benefit-icon-bg)] text-[color:var(--paywall-benefit-icon-fg)]"
                  : "bg-[color:var(--paywall-badge-discount-bg)] text-[color:var(--paywall-badge-discount-text)] ring-1 ring-[color:var(--paywall-badge-discount-ring)]",
              )}
            >
              {PRO_ANNUAL_DISCOUNT_LABEL}
            </span>
          ) : null}
        </div>
      ) : compact ? null : (
        <span className="mb-2 block min-h-[1.375rem]" aria-hidden />
      )}

      <span
        className={cn(
          "block font-semibold uppercase tracking-[0.12em]",
          compact ? "text-[0.62rem]" : "text-[0.72rem]",
          selected
            ? "text-[color:var(--paywall-pricing-selected-muted)]"
            : "text-[color:var(--vd-muted)]",
        )}
      >
        {title}
      </span>

      {anchor.referencePrice ? (
        <span
          className={cn(
            "mt-0.5 block line-through",
            compact ? "text-[0.68rem]" : "text-[0.78rem] mt-1",
            selected
              ? "text-[color:var(--paywall-pricing-selected-subtle)]"
              : "text-[color:var(--vd-muted)]",
          )}
        >
          {anchor.referencePrice}
        </span>
      ) : null}

      <span
        className={cn(
          "mt-0.5 block font-semibold tracking-[-0.02em] transition-[font-size] duration-350 [transition-timing-function:var(--vd-ease-spring)]",
          compact ? (selected ? "text-[0.94rem]" : "text-[0.88rem]") : "text-[0.98rem]",
        )}
      >
        {anchor.currentPrice}
      </span>

      {anchor.monthlyEquivalent ? (
        <span
          className={cn(
            "mt-0.5 block leading-snug",
            compact ? "text-[0.66rem]" : "text-[0.74rem]",
            selected
              ? "text-[color:var(--paywall-pricing-selected-strong)]"
              : "text-[color:var(--vd-muted)]",
          )}
        >
          {anchor.monthlyEquivalent}
        </span>
      ) : null}

      {anchor.flexSubline ? (
        <span
          className={cn(
            "mt-0.5 block leading-snug",
            compact ? "text-[0.64rem]" : "text-[0.72rem]",
            selected
              ? "text-[color:var(--paywall-pricing-selected-strong)]"
              : "text-[color:var(--vd-muted)]",
          )}
        >
          {anchor.flexSubline}
        </span>
      ) : null}

      {!compact ? (
        <span
          className={cn(
            "mt-2 block text-[0.72rem] font-medium leading-snug",
            selected
              ? "text-[color:var(--paywall-pricing-selected-accent)]"
              : "text-[color:var(--paywall-pricing-trial-unselected)]",
          )}
        >
          {anchor.trialLabel}
        </span>
      ) : null}
      </div>
    </button>
  );
}
