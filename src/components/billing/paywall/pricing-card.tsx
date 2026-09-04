"use client";

import {
  PRO_ANNUAL_RECOMMENDED_LABEL,
  proPaywallPricingAnchor,
  type ProBillingInterval,
} from "@/lib/billing/pro-plan";
import { cn } from "@/lib/utils";

export function PricingCard({
  interval,
  selected,
  onSelect,
  compact = false,
}: {
  interval: ProBillingInterval;
  selected: boolean;
  onSelect: () => void;
  compact?: boolean;
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
        "relative rounded-2xl border text-left transition-all duration-200",
        compact ? "px-3 py-2.5" : "px-4 py-3.5",
        selected
          ? "scale-[1.01] border-blue-600 bg-blue-50/60 ring-2 ring-blue-600"
          : "border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)] text-[color:var(--vd-text)] hover:border-neutral-400",
      )}
    >
      {badge ? (
        <span
          className={cn(
            "mb-1.5 inline-flex rounded-full px-2 py-0.5 font-semibold uppercase tracking-[0.08em]",
            compact ? "text-[0.58rem]" : "text-[0.62rem] mb-2",
            selected
              ? "bg-blue-600 text-white"
              : "bg-neutral-900 text-white",
          )}
        >
          {compact ? "Beliebt" : badge}
        </span>
      ) : compact ? null : (
        <span className="mb-2 block min-h-[1.375rem]" aria-hidden />
      )}

      <span
        className={cn(
          "block font-semibold uppercase tracking-[0.12em]",
          compact ? "text-[0.62rem]" : "text-[0.72rem]",
          selected ? "text-blue-800/80" : "text-[color:var(--vd-muted)]",
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
              ? "text-blue-800/50"
              : "text-[color:var(--vd-muted)]",
          )}
        >
          {anchor.referencePrice}
        </span>
      ) : null}

      {anchor.foundersDiscountLabel ? (
        <span
          className={cn(
            "mt-0.5 block font-semibold uppercase tracking-[0.08em]",
            compact ? "text-[0.58rem]" : "text-[0.68rem] mt-1",
            selected
              ? "text-emerald-700"
              : "text-emerald-700",
          )}
        >
          {anchor.foundersDiscountLabel}
        </span>
      ) : null}

      {anchor.savingsLabel ? (
        <span
          className={cn(
            "mt-0.5 block font-semibold uppercase tracking-[0.08em]",
            compact ? "text-[0.58rem]" : "text-[0.68rem] mt-1",
            selected
              ? "text-emerald-700"
              : "text-emerald-700",
          )}
        >
          {anchor.savingsLabel}
        </span>
      ) : null}

      <span
        className={cn(
          "mt-0.5 block font-semibold tracking-[-0.02em]",
          compact ? "text-[0.88rem]" : "text-[0.98rem]",
        )}
      >
        {anchor.currentPrice}
      </span>

      {anchor.monthlyEquivalent ? (
        <span
          className={cn(
            "mt-0.5 block leading-snug",
            compact ? "text-[0.66rem]" : "text-[0.74rem]",
            selected ? "text-blue-900/80" : "text-[color:var(--vd-muted)]",
          )}
        >
          {anchor.monthlyEquivalent}
        </span>
      ) : null}

      <span
        className={cn(
          "mt-0.5 block leading-snug",
          compact ? "text-[0.64rem]" : "text-[0.72rem] mt-1",
          selected ? "text-blue-900/70" : "text-[color:var(--vd-muted)]",
        )}
      >
        {anchor.weeklyAnchor}
      </span>

      {!compact && anchor.flexSubline ? (
        <span
          className={cn(
            "mt-0.5 block text-[0.72rem] leading-snug",
            selected ? "text-blue-800/80" : "text-[color:var(--vd-muted)]",
          )}
        >
          {anchor.flexSubline}
        </span>
      ) : null}

      {!compact ? (
        <span
          className={cn(
            "mt-2 block text-[0.72rem] font-medium leading-snug",
            selected ? "text-blue-800" : "text-emerald-700",
          )}
        >
          {anchor.trialLabel}
        </span>
      ) : null}
    </button>
  );
}
