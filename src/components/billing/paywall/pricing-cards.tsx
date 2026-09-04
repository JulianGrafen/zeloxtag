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
          "vd-anim-stagger grid items-center overflow-visible",
          showAnnualPlan ? "grid-cols-2" : "grid-cols-1",
          compact ? "gap-3" : "mt-3 gap-3",
        )}
        role="radiogroup"
        aria-label="Abrechnungsintervall"
      >
        <PricingCard
          interval="monthly"
          selected={interval === "monthly"}
          onSelect={() => onIntervalChange("monthly")}
          compact={compact}
          shinePosition={position}
          shineMotionActive={motionActive}
        />
        {showAnnualPlan ? (
          <PricingCard
            interval="annual"
            selected={interval === "annual"}
            onSelect={() => onIntervalChange("annual")}
            compact={compact}
          />
        ) : null}
      </div>
    </div>
  );
}
