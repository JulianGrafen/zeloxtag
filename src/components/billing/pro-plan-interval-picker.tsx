"use client";

import {
  PRO_ANNUAL_RECOMMENDED_LABEL,
  PRO_TRIAL_LABEL,
  proIntervalPickerDetail,
  proIntervalPriceDisplay,
  type ProBillingInterval,
} from "@/lib/billing/pro-plan";
import { cn } from "@/lib/utils";

export function ProPlanIntervalPicker({
  value,
  onChange,
  showAnnual = true,
}: {
  value: ProBillingInterval;
  onChange: (interval: ProBillingInterval) => void;
  showAnnual?: boolean;
}) {
  if (!showAnnual) return null;

  const monthlyPrice = proIntervalPriceDisplay("monthly");
  const annualPrice = proIntervalPriceDisplay("annual");

  return (
    <div
      className="grid grid-cols-2 gap-2"
      role="radiogroup"
      aria-label="Abrechnungsintervall"
    >
      <IntervalOption
        selected={value === "monthly"}
        title="Monatlich"
        price={monthlyPrice.primary}
        priceSecondary={monthlyPrice.secondary}
        detail={proIntervalPickerDetail("monthly")}
        trialLabel={PRO_TRIAL_LABEL}
        onSelect={() => onChange("monthly")}
      />
      <IntervalOption
        selected={value === "annual"}
        title="Jährlich"
        price={annualPrice.primary}
        priceSecondary={annualPrice.secondary}
        detail={proIntervalPickerDetail("annual")}
        trialLabel={PRO_TRIAL_LABEL}
        badge={PRO_ANNUAL_RECOMMENDED_LABEL}
        onSelect={() => onChange("annual")}
      />
    </div>
  );
}

function IntervalOption({
  selected,
  title,
  price,
  priceSecondary,
  detail,
  trialLabel,
  badge,
  onSelect,
}: {
  selected: boolean;
  title: string;
  price: string;
  priceSecondary?: string;
  detail: string;
  trialLabel: string;
  badge?: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "relative rounded-2xl border px-3 py-3 text-left transition-colors",
        selected
          ? "border-neutral-900 bg-neutral-900 text-white shadow-[var(--vd-shadow-sm)]"
          : "border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)] text-[color:var(--vd-text)] hover:border-neutral-400",
      )}
    >
      {badge ? (
        <span
          className={cn(
            "mb-2 inline-flex rounded-full px-2 py-0.5 text-[0.62rem] font-semibold uppercase tracking-[0.08em]",
            selected
              ? "bg-white/15 text-white"
              : "bg-neutral-900 text-white",
          )}
        >
          {badge}
        </span>
      ) : (
        <span className="mb-2 block min-h-[1.375rem]" aria-hidden />
      )}
      <span className="block text-[0.72rem] font-semibold uppercase tracking-[0.12em] opacity-80">
        {title}
      </span>
      <span className="mt-1 block text-[0.95rem] font-semibold tracking-[-0.02em]">
        {price}
      </span>
      {priceSecondary ? (
        <span
          className={cn(
            "mt-0.5 block text-[0.72rem] leading-snug",
            selected ? "text-white/70" : "text-[color:var(--vd-muted)]",
          )}
        >
          {priceSecondary}
        </span>
      ) : null}
      <span
        className={cn(
          "mt-2 block text-[0.72rem] leading-snug",
          selected ? "text-white/75" : "text-[color:var(--vd-muted)]",
        )}
      >
        {detail}
      </span>
      <span
        className={cn(
          "mt-1 block text-[0.72rem] font-medium leading-snug",
          selected ? "text-white/90" : "text-[color:var(--vd-text)]",
        )}
      >
        {trialLabel}
      </span>
    </button>
  );
}
