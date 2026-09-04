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
  highlighted = interval === "annual",
}: {
  interval: ProBillingInterval;
  selected: boolean;
  onSelect: () => void;
  highlighted?: boolean;
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
        "relative rounded-2xl border px-4 py-3.5 text-left transition-all duration-200",
        selected && highlighted
          ? "scale-[1.01] border-blue-600 bg-blue-50/60 ring-2 ring-blue-600"
          : selected
            ? "scale-[1.01] border-neutral-900 bg-neutral-900 text-white shadow-[var(--vd-shadow-sm)]"
            : "border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)] text-[color:var(--vd-text)] hover:border-neutral-400",
      )}
    >
      {badge ? (
        <span
          className={cn(
            "mb-2 inline-flex rounded-full px-2 py-0.5 text-[0.62rem] font-semibold uppercase tracking-[0.08em]",
            selected && highlighted
              ? "bg-blue-600 text-white"
              : selected
                ? "bg-white/15 text-white"
                : "bg-neutral-900 text-white",
          )}
        >
          {badge}
        </span>
      ) : (
        <span className="mb-2 block min-h-[1.375rem]" aria-hidden />
      )}

      <span
        className={cn(
          "block text-[0.72rem] font-semibold uppercase tracking-[0.12em]",
          selected && !highlighted ? "opacity-80" : "text-[color:var(--vd-muted)]",
          selected && highlighted && "text-blue-800/80",
        )}
      >
        {title}
      </span>

      {anchor.referencePrice ? (
        <span
          className={cn(
            "mt-1 block text-[0.78rem] line-through",
            selected && highlighted
              ? "text-blue-800/50"
              : selected && !highlighted
                ? "text-white/50"
                : "text-[color:var(--vd-muted)]",
          )}
        >
          {anchor.referencePrice}
        </span>
      ) : null}

      {anchor.foundersDiscountLabel ? (
        <span
          className={cn(
            "mt-1 block text-[0.68rem] font-semibold uppercase tracking-[0.08em]",
            selected && highlighted
              ? "text-emerald-700"
              : selected && !highlighted
                ? "text-emerald-300"
                : "text-emerald-700",
          )}
        >
          {anchor.foundersDiscountLabel}
        </span>
      ) : null}

      <span className="mt-0.5 block text-[0.98rem] font-semibold tracking-[-0.02em]">
        {anchor.currentPrice}
      </span>

      {anchor.monthlyEquivalent ? (
        <span
          className={cn(
            "mt-0.5 block text-[0.74rem] leading-snug",
            selected && highlighted
              ? "text-blue-900/80"
              : selected && !highlighted
                ? "text-white/75"
                : "text-[color:var(--vd-muted)]",
          )}
        >
          {anchor.monthlyEquivalent}
        </span>
      ) : null}

      <span
        className={cn(
          "mt-1 block text-[0.72rem] leading-snug",
          selected && highlighted
            ? "text-blue-900/70"
            : selected && !highlighted
              ? "text-white/70"
              : "text-[color:var(--vd-muted)]",
        )}
      >
        {anchor.weeklyAnchor}
      </span>

      {anchor.flexSubline ? (
        <span
          className={cn(
            "mt-0.5 block text-[0.72rem] leading-snug",
            selected && !highlighted
              ? "text-white/75"
              : "text-[color:var(--vd-muted)]",
          )}
        >
          {anchor.flexSubline}
        </span>
      ) : null}

      <span
        className={cn(
          "mt-2 block text-[0.72rem] font-medium leading-snug",
          selected && highlighted
            ? "text-blue-800"
            : selected && !highlighted
              ? "text-white/90"
              : "text-emerald-700",
        )}
      >
        {anchor.trialLabel}
      </span>
    </button>
  );
}
