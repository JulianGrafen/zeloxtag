"use client";

import { BenefitList } from "@/components/billing/paywall/benefit-list";
import { PaywallHero } from "@/components/billing/paywall/paywall-hero";
import { PaywallProgress } from "@/components/billing/paywall/paywall-progress";
import { PricingCards } from "@/components/billing/paywall/pricing-cards";
import { TrialTimeline } from "@/components/billing/paywall/trial-timeline";
import {
  PRO_PAYWALL_FREE_SCAN_EXHAUSTED_KICKER,
  PRO_PLAN_NAME,
  type ProBillingInterval,
} from "@/lib/billing/pro-plan";
import type { PaywallVariant } from "@/lib/permissions/feature-access";
import { cn } from "@/lib/utils";

type ProPaywallContentProps = {
  interval: ProBillingInterval;
  onIntervalChange: (interval: ProBillingInterval) => void;
  showAnnualPlan: boolean;
  headline: string;
  subline: string;
  headlineId?: string;
  showConversionExtras?: boolean;
  variant?: PaywallVariant;
  layout?: "modal" | "section";
  statusMessage?: React.ReactNode;
  belowFoldFooter?: React.ReactNode;
  ctaSlot: React.ReactNode;
};

export function ProPaywallContent({
  interval,
  onIntervalChange,
  showAnnualPlan,
  headline,
  subline,
  headlineId,
  showConversionExtras = true,
  variant = "default",
  layout = "modal",
  statusMessage,
  belowFoldFooter,
  ctaSlot,
}: ProPaywallContentProps) {
  const compact = true;
  const isModal = layout === "modal";

  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col",
        isModal ? "h-full" : "",
      )}
    >
      <div className={cn("shrink-0", isModal ? "px-4 pt-14" : "")}>
        <div className={cn("vd-anim-header w-full", isModal ? "mx-auto max-w-lg" : "")}>
          <p className="claim-kicker">{PRO_PLAN_NAME}</p>

          {showConversionExtras && variant === "free_scan_exhausted" ? (
            <p className="mt-2 inline-flex rounded-full bg-amber-50 px-3 py-1 text-[0.72rem] font-semibold tracking-[0.06em] text-amber-900 uppercase">
              {PRO_PAYWALL_FREE_SCAN_EXHAUSTED_KICKER}
            </p>
          ) : null}

          {showConversionExtras ? (
            <PaywallProgress compact={compact} />
          ) : null}

          <PaywallHero
            headline={headline}
            subline={subline}
            headlineId={headlineId}
            showTrialBadge={showConversionExtras}
            compact={compact}
          />

          {statusMessage ? <div className="mt-2">{statusMessage}</div> : null}

          <PricingCards
            interval={interval}
            onIntervalChange={onIntervalChange}
            showAnnualPlan={showAnnualPlan}
            compact={compact}
          />
        </div>
      </div>

      {showConversionExtras ? (
        <div
          className={cn(
            "min-h-0 flex-1 overflow-y-auto overscroll-contain",
            isModal ? "px-4 pb-2" : "mt-4",
          )}
        >
          <div className={cn(isModal ? "mx-auto max-w-lg" : "")}>
            <BenefitList compact={compact} />
            <TrialTimeline compact={compact} />
            {belowFoldFooter}
          </div>
        </div>
      ) : null}

      <div className={cn("shrink-0", isModal ? "" : "mt-4")}>{ctaSlot}</div>
    </div>
  );
}
