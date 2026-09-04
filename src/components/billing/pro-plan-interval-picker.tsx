"use client";

import { PricingCards } from "@/components/billing/paywall/pricing-cards";
import type { ProBillingInterval } from "@/lib/billing/pro-plan";

export function ProPlanIntervalPicker({
  value,
  onChange,
  showAnnual = true,
}: {
  value: ProBillingInterval;
  onChange: (interval: ProBillingInterval) => void;
  showAnnual?: boolean;
}) {
  if (!showAnnual) {
    return (
      <PricingCards
        interval="monthly"
        onIntervalChange={onChange}
        showAnnualPlan={false}
      />
    );
  }

  return (
    <PricingCards
      interval={value}
      onIntervalChange={onChange}
      showAnnualPlan={showAnnual}
    />
  );
}
