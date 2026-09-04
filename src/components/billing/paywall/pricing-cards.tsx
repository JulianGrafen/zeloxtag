"use client";

import { DiscountBanner } from "@/components/billing/paywall/discount-banner";
import { PricingCard } from "@/components/billing/paywall/pricing-card";
import type { ProBillingInterval } from "@/lib/billing/pro-plan";
import { cn } from "@/lib/utils";

export function PricingCards({
  interval,
  onIntervalChange,
  showAnnualPlan,
  compact = false,
}: {
  interval: ProBillingInterval;
  onIntervalChange: (interval: ProBillingInterval) => void;
  showAnnualPlan: boolean;
  compact?: boolean;
}) {
  return (
    <div className={cn(compact ? "mt-3" : "mt-6")}>
      {showAnnualPlan ? <DiscountBanner compact={compact} /> : null}

      <div
        className={cn(
          "vd-anim-stagger grid gap-2",
          showAnnualPlan ? "grid-cols-2" : "grid-cols-1",
          compact ? "mt-2" : "mt-3 gap-3",
        )}
        role="radiogroup"
        aria-label="Abrechnungsintervall"
      >
        <PricingCard
          interval="monthly"
          selected={interval === "monthly"}
          onSelect={() => onIntervalChange("monthly")}
          compact={compact}
        />
        {showAnnualPlan ? (
          <PricingCard
            interval="annual"
            selected={interval === "annual"}
            onSelect={() => onIntervalChange("annual")}
            highlighted
            compact={compact}
          />
        ) : null}
      </div>
    </div>
  );
}
