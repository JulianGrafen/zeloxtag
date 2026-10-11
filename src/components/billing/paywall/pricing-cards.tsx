"use client";

import { PricingCard } from "@/components/billing/paywall/pricing-card";
import { useDeviceMotionShine } from "@/lib/hooks/use-device-motion-shine";
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
  const { position, motionActive } = useDeviceMotionShine(true);

  return (
    <div className={cn(compact ? "mt-0" : "mt-6", className)}>
      <div
        className={cn(
          "paywall-pricing-stack flex flex-col gap-2 overflow-visible",
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
          shinePosition={position}
          shineMotionActive={motionActive}
        />
      </div>
    </div>
  );
}
