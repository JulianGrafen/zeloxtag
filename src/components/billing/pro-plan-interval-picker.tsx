"use client";

import {
  PRO_ANNUAL_RECOMMENDED_LABEL,
  PRO_ANNUAL_SAVINGS_COPY,
  PRO_PLAN_ANNUAL_PRICE,
  PRO_PLAN_MONTHLY_PRICE,
  proTrialHint,
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

  return (
    <div
      className="grid grid-cols-2 gap-2"
      role="radiogroup"
      aria-label="Abrechnungsintervall"
    >
      <IntervalOption
        selected={value === "monthly"}
        title="Monatlich"
        price={`${PRO_PLAN_MONTHLY_PRICE} / Monat`}
        hint={proTrialHint("monthly")}
        onSelect={() => onChange("monthly")}
      />
      <IntervalOption
        selected={value === "annual"}
        title="Jährlich"
        price={`${PRO_PLAN_ANNUAL_PRICE} / Jahr`}
        hint={proTrialHint("annual")}
        badges={[
          { label: PRO_ANNUAL_RECOMMENDED_LABEL, tone: "recommended" },
          { label: PRO_ANNUAL_SAVINGS_COPY, tone: "savings" },
        ]}
        onSelect={() => onChange("annual")}
      />
    </div>
  );
}

type IntervalBadge = {
  label: string;
  tone: "recommended" | "savings";
};

function IntervalOption({
  selected,
  title,
  price,
  hint,
  badges = [],
  onSelect,
}: {
  selected: boolean;
  title: string;
  price: string;
  hint: string;
  badges?: IntervalBadge[];
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
      <span className="mb-2 flex min-h-[1.375rem] flex-wrap gap-1">
        {badges.map((badge) => (
          <span
            key={badge.label}
            className={cn(
              "inline-flex rounded-full px-2 py-0.5 text-[0.62rem] font-semibold uppercase tracking-[0.08em]",
              badge.tone === "recommended"
                ? selected
                  ? "bg-white/15 text-white"
                  : "bg-neutral-900 text-white"
                : selected
                  ? "bg-emerald-400/20 text-emerald-100"
                  : "bg-emerald-100 text-emerald-800",
            )}
          >
            {badge.label}
          </span>
        ))}
      </span>
      <span className="block text-[0.72rem] font-semibold uppercase tracking-[0.12em] opacity-80">
        {title}
      </span>
      <span className="mt-1 block text-[0.95rem] font-semibold tracking-[-0.02em]">
        {price}
      </span>
      <span
        className={cn(
          "mt-1 block text-[0.72rem] leading-snug",
          selected ? "text-white/75" : "text-[color:var(--vd-muted)]",
        )}
      >
        {hint}
      </span>
    </button>
  );
}
