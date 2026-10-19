"use client";

import { CheckCircle2, Circle } from "lucide-react";

import {
  proPaywallCardCopy,
  proPaywallPricingAnchor,
  type ProBillingInterval,
} from "@/lib/billing/pro-plan";
import { cn } from "@/lib/utils";

export function PricingCard({
  interval,
  selected,
  onSelect,
  compact = false,
  embeddedInCard = false,
  showTopDivider = false,
}: {
  interval: ProBillingInterval;
  selected: boolean;
  onSelect: () => void;
  compact?: boolean;
  embeddedInCard?: boolean;
  showTopDivider?: boolean;
  shinePosition?: unknown;
  shineMotionActive?: boolean;
}) {
  if (compact) {
    const copy = proPaywallCardCopy(interval);

    return (
      <button
        type="button"
        role="radio"
        aria-checked={selected}
        onClick={onSelect}
        className={cn(
          "paywall-plan-row relative flex w-full items-start gap-3 px-3.5 py-3 text-left",
          embeddedInCard ? "rounded-none" : "rounded-2xl",
          "transition-[border-color,background-color,box-shadow] duration-200 ease-out",
          embeddedInCard &&
            showTopDivider &&
            "border-t border-[color:var(--paywall-grouped-separator)]",
          selected
            ? embeddedInCard
              ? "bg-[color:var(--paywall-pricing-selected-bg)]"
              : "bg-[color:var(--paywall-pricing-selected-bg)] ring-1 ring-[color:var(--paywall-pricing-selected-border)]"
            : embeddedInCard
              ? "bg-transparent hover:bg-[color:var(--paywall-grouped-bg-hover)]"
              : "bg-[color:var(--paywall-grouped-bg)] ring-1 ring-transparent hover:bg-[color:var(--paywall-grouped-bg-hover)]",
        )}
      >
        <span className="min-w-0 flex-1">
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

          <span className="mt-0.5 block text-[17px] font-semibold tracking-[-0.03em] text-[color:var(--vd-text)]">
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
          className="mt-0.5 shrink-0 text-[color:var(--paywall-apple-blue)] transition-opacity duration-200 ease-out"
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

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "relative overflow-hidden rounded-2xl border px-4 py-3.5 text-left transition-colors duration-200 ease-out",
        selected
          ? "border-[color:var(--paywall-pricing-selected-border)] bg-[color:var(--paywall-pricing-selected-bg)] ring-2 ring-[color:var(--paywall-pricing-selected-border)]"
          : "border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)]",
      )}
    >
      <span className="block text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-[color:var(--vd-muted)]">
        {title}
      </span>
      <span className="mt-1 block font-semibold">{anchor.currentPrice}</span>
      {anchor.monthlyEquivalent ? (
        <span className="mt-0.5 block text-[0.74rem] text-[color:var(--vd-muted)]">
          {anchor.monthlyEquivalent}
        </span>
      ) : null}
      {anchor.flexSubline ? (
        <span className="mt-2 block text-[0.72rem] text-[color:var(--vd-muted)]">
          {anchor.flexSubline}
        </span>
      ) : null}
    </button>
  );
}
