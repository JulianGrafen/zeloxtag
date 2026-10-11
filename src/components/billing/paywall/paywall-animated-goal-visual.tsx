"use client";

import { PaywallGoalVisual } from "@/components/billing/paywall/paywall-goal-visual";
import type { PaywallVisualKind } from "@/lib/billing/paywall-personalization";
import { cn } from "@/lib/utils";

export function PaywallAnimatedGoalVisual({
  kind,
  ariaLabel,
  className,
}: {
  kind: PaywallVisualKind;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "paywall-hero-visual relative shrink-0 overflow-hidden bg-[color:var(--paywall-sheet-bg)] px-3 pt-1 pb-0",
        className,
      )}
    >
      <PaywallGoalVisual kind={kind} ariaLabel={ariaLabel} compact />
    </div>
  );
}
