"use client";

import type { ReactNode } from "react";

import { PaywallGoalVisual } from "@/components/billing/paywall/paywall-goal-visual";
import type { PaywallVisualKind } from "@/lib/billing/paywall-personalization";
import { cn } from "@/lib/utils";

type PaywallModalFoldProps = {
  benefits: ReactNode;
  pricing: ReactNode;
  timeline: ReactNode;
  visualKind?: PaywallVisualKind;
  visualAriaLabel?: string;
  bottomNote?: string;
  footer?: ReactNode;
  className?: string;
};

/** Modal paywall body — scroll handled by parent in ProPaywallContent. */
export function PaywallModalFold({
  benefits,
  pricing,
  timeline,
  visualKind = "resale_chart",
  visualAriaLabel,
  bottomNote,
  footer,
  className,
}: PaywallModalFoldProps) {
  return (
    <div className={cn("flex flex-col gap-2.5", className)}>
      <div className="pb-2">{benefits}</div>

      <PaywallGoalVisual
        kind={visualKind}
        ariaLabel={
          visualAriaLabel ??
          "Fahrzeugwert beim Verkauf: mit ZeloxTag höher als ohne Dokumentation"
        }
        compact
        className="shrink-0"
      />

      <div className="shrink-0 pt-1">{pricing}</div>
      <div className="shrink-0">{timeline}</div>
      {bottomNote ? (
        <div className="shrink-0 px-1 pt-2 pb-3">
          <p className="text-center text-[0.78rem] leading-snug text-[color:var(--vd-muted)]">
            {bottomNote}
          </p>
        </div>
      ) : null}
      {footer ? <div className="shrink-0">{footer}</div> : null}
    </div>
  );
}
