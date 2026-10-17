"use client";

import { PricingCard } from "@/components/billing/paywall/pricing-card";
import type { ProBillingInterval } from "@/lib/billing/pro-plan";
import { cn } from "@/lib/utils";

export function PricingCards({
  interval,
  onIntervalChange,
  showAnnualPlan,
  compact = false,
  embeddedInCard = false,
  className,
}: {
  interval: ProBillingInterval;
  onIntervalChange: (interval: ProBillingInterval) => void;
  showAnnualPlan: boolean;
  compact?: boolean;
  embeddedInCard?: boolean;
  className?: string;
}) {
  return (
    <div className={cn(compact ? "mt-0" : "mt-6", className)}>
      <div
        className={cn(
          "paywall-pricing-stack flex flex-col",
          embeddedInCard ? "gap-0" : "gap-2",
          !compact && !embeddedInCard && "mt-3",
          embeddedInCard && "px-1 py-1",
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
            embeddedInCard={embeddedInCard}
            showTopDivider={false}
          />
        ) : null}
        <PricingCard
          interval="monthly"
          selected={interval === "monthly"}
          onSelect={() => onIntervalChange("monthly")}
          compact={compact}
          embeddedInCard={embeddedInCard}
          showTopDivider={showAnnualPlan}
        />
      </div>
    </div>
  );
}
