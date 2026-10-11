"use client";

import { PricingCard } from "@/components/billing/paywall/pricing-card";
import type { ProBillingInterval } from "@/lib/billing/pro-plan";
import { cn } from "@/lib/utils";

export function PricingCards({
  interval,
  onIntervalChange,
  showAnnualPlan,
  compact = false,
  className,
}: {
  interval: ProBillingInterval;
  onIntervalChange: (interval: ProBillingInterval) => void;
  showAnnualPlan: boolean;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={cn(compact ? "mt-0" : "mt-6", className)}>
      <div
        className={cn(
          "paywall-pricing-stack flex flex-col gap-2",
          !compact && "mt-3",
        )}
        role="radiogroup"
        aria-label="Abrechnungsintervall"
      >
        {showAnnualPlan ? (
          <PricingCard
            interval="annual"
            selected={interval === "annual"}
            onSelect={() => onIntervalChange("annual")}
            compact={compact}
          />
        ) : null}
        <PricingCard
          interval="monthly"
          selected={interval === "monthly"}
          onSelect={() => onIntervalChange("monthly")}
          compact={compact}
        />
      </div>
    </div>
  );
}
