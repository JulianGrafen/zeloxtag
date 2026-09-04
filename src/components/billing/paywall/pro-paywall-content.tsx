"use client";

import { BenefitList } from "@/components/billing/paywall/benefit-list";
import { PaywallModalFold } from "@/components/billing/paywall/paywall-modal-fold";
import { PricingCards } from "@/components/billing/paywall/pricing-cards";
import { TrialTimeline } from "@/components/billing/paywall/trial-timeline";
import {
  PRO_PAYWALL_FREE_SCAN_EXHAUSTED_KICKER,
  PRO_PAYWALL_MODAL_SUBLINE,
  type ProBillingInterval,
} from "@/lib/billing/pro-plan";
import type { PaywallVariant } from "@/lib/permissions/feature-access";
import { cn } from "@/lib/utils";

export type ProPaywallLayout = "modal" | "section" | "settings";

type ProPaywallContentProps = {
  interval: ProBillingInterval;
  onIntervalChange: (interval: ProBillingInterval) => void;
  showAnnualPlan: boolean;
  headline: string;
  headlineId?: string;
  showConversionExtras?: boolean;
  variant?: PaywallVariant;
  layout?: ProPaywallLayout;
  statusMessage?: React.ReactNode;
  belowFoldFooter?: React.ReactNode;
  ctaSlot: React.ReactNode;
};

export function ProPaywallContent({
  interval,
  onIntervalChange,
  showAnnualPlan,
  headline,
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
  const isStacked = layout === "section" || layout === "settings";
  const contentWidth = cn(isModal ? "mx-auto w-full max-w-lg" : "");

  return (
    <div
      className={cn(
        "flex min-h-0 flex-col",
        isModal ? "h-full min-h-0 flex-1" : "gap-5",
      )}
    >
      <div className={cn("shrink-0", isModal ? "px-4 pt-10" : "")}>
        <div className={cn("vd-anim-header w-full", contentWidth)}>
          {showConversionExtras && variant === "free_scan_exhausted" ? (
            <p className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-[0.68rem] font-semibold tracking-[0.06em] text-amber-900 uppercase">
              {PRO_PAYWALL_FREE_SCAN_EXHAUSTED_KICKER}
            </p>
          ) : null}

          <h2
            id={headlineId}
            className={cn(
              "font-[family-name:var(--font-display)] font-semibold tracking-[-0.03em] text-[color:var(--vd-text)]",
              variant === "free_scan_exhausted" ? "mt-2" : "",
              isModal
                ? "text-[1.05rem] leading-snug"
                : isStacked
                  ? "text-[1.15rem] leading-snug"
                  : "text-[1.15rem] leading-snug sm:text-[1.25rem]",
            )}
          >
            {headline}
          </h2>

          {showConversionExtras && isModal ? (
            <p className="mt-2.5 text-[0.78rem] leading-snug text-[color:var(--vd-muted)]">
              {PRO_PAYWALL_MODAL_SUBLINE}
            </p>
          ) : null}

          {statusMessage ? <div className="mt-2.5">{statusMessage}</div> : null}
        </div>
      </div>

      {showConversionExtras ? (
        isModal ? (
          <div className={cn("min-h-0 flex-1 px-4 pt-2", contentWidth)}>
            <PaywallModalFold
              benefits={<BenefitList compact={compact} />}
              pricing={
                <PricingCards
                  interval={interval}
                  onIntervalChange={onIntervalChange}
                  showAnnualPlan={showAnnualPlan}
                  compact={compact}
                  className="!mt-0"
                />
              }
              timeline={<TrialTimeline compact={compact} />}
              footer={belowFoldFooter}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <BenefitList compact={compact} />
            <PricingCards
              interval={interval}
              onIntervalChange={onIntervalChange}
              showAnnualPlan={showAnnualPlan}
              compact={compact}
              className="!mt-0"
            />
            <TrialTimeline compact={compact} />
            {belowFoldFooter}
          </div>
        )
      ) : (
        <div className={cn("shrink-0", isModal ? "px-4" : "")}>
          <div className={contentWidth}>
            <PricingCards
              interval={interval}
              onIntervalChange={onIntervalChange}
              showAnnualPlan={showAnnualPlan}
              compact={compact}
            />
            {belowFoldFooter}
          </div>
        </div>
      )}

      <div className={cn("relative z-20 shrink-0", isModal ? "mt-auto px-4 pb-2 pt-4" : "")}>
        {ctaSlot}
      </div>
    </div>
  );
}
