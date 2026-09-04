"use client";

import { DiscountBanner } from "@/components/billing/paywall/discount-banner";
import { PricingCard } from "@/components/billing/paywall/pricing-card";
import type { ProBillingInterval } from "@/lib/billing/pro-plan";
import { cn } from "@/lib/utils";

export function PricingCards({
  interval,
  onIntervalChange,
  showAnnualPlan,
}: {
  interval: ProBillingInterval;
  onIntervalChange: (interval: ProBillingInterval) => void;
  showAnnualPlan: boolean;
}) {
  return (
    <div className="mt-6">
      {showAnnualPlan && interval === "annual" ? <DiscountBanner /> : null}

      <div
        className={cn(
          "vd-anim-stagger mt-3 grid gap-3",
          showAnnualPlan ? "sm:grid-cols-2" : "grid-cols-1",
        )}
        role="radiogroup"
        aria-label="Abrechnungsintervall"
      >
        <PricingCard
          interval="monthly"
          selected={interval === "monthly"}
          onSelect={() => onIntervalChange("monthly")}
        />
        {showAnnualPlan ? (
          <PricingCard
            interval="annual"
            selected={interval === "annual"}
            onSelect={() => onIntervalChange("annual")}
            highlighted
          />
        ) : null}
      </div>
    </div>
  );
}
