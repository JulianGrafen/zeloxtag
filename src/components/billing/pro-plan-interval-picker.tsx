"use client";

import {
  PRO_PLAN_ANNUAL_PRICE,
  PRO_PLAN_MONTHLY_PRICE,
  PRO_TRIAL_DAYS,
  type ProBillingInterval,
} from "@/lib/billing/pro-plan";

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
        hint={`${PRO_TRIAL_DAYS} Tage kostenlos`}
        onSelect={() => onChange("monthly")}
      />
      <IntervalOption
        selected={value === "annual"}
        title="Jährlich"
        price={`${PRO_PLAN_ANNUAL_PRICE} / Jahr`}
        hint="ZeloxTag PRO · Jahresabo"
        onSelect={() => onChange("annual")}
      />
    </div>
  );
}

function IntervalOption({
  selected,
  title,
  price,
  hint,
  onSelect,
}: {
  selected: boolean;
  title: string;
  price: string;
  hint: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={[
        "rounded-2xl border px-3 py-3 text-left transition-colors",
        selected
          ? "border-neutral-900 bg-neutral-900 text-white shadow-[var(--vd-shadow-sm)]"
          : "border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)] text-[color:var(--vd-text)] hover:border-neutral-400",
      ].join(" ")}
    >
      <span className="block text-[0.72rem] font-semibold uppercase tracking-[0.12em] opacity-80">
        {title}
      </span>
      <span className="mt-1 block text-[0.95rem] font-semibold tracking-[-0.02em]">
        {price}
      </span>
      <span
        className={[
          "mt-1 block text-[0.72rem] leading-snug",
          selected ? "text-white/75" : "text-[color:var(--vd-muted)]",
        ].join(" ")}
      >
        {hint}
      </span>
    </button>
  );
}
