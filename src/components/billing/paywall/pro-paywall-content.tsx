"use client";

import { BenefitList } from "@/components/billing/paywall/benefit-list";
import { PricingCards } from "@/components/billing/paywall/pricing-cards";
import { TrialTimeline } from "@/components/billing/paywall/trial-timeline";
import {
  PRO_PAYWALL_FREE_SCAN_EXHAUSTED_KICKER,
  type ProBillingInterval,
} from "@/lib/billing/pro-plan";
import type { PaywallVariant } from "@/lib/permissions/feature-access";
import { cn } from "@/lib/utils";

type ProPaywallContentProps = {
  interval: ProBillingInterval;
  onIntervalChange: (interval: ProBillingInterval) => void;
  showAnnualPlan: boolean;
  headline: string;
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
  const contentWidth = cn(isModal ? "mx-auto max-w-lg" : "");

  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col",
        isModal ? "h-full" : "",
      )}
    >
      <div className={cn("shrink-0", isModal ? "px-4 pt-12" : "")}>
        <div className={cn("vd-anim-header w-full", contentWidth)}>
          {showConversionExtras && variant === "free_scan_exhausted" ? (
            <p className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-[0.72rem] font-semibold tracking-[0.06em] text-amber-900 uppercase">
              {PRO_PAYWALL_FREE_SCAN_EXHAUSTED_KICKER}
            </p>
          ) : null}

          <h2
            id={headlineId}
            className={cn(
              "font-[family-name:var(--font-display)] font-semibold tracking-[-0.03em] text-[color:var(--vd-text)]",
              variant === "free_scan_exhausted" ? "mt-2" : "",
              "text-[1.15rem] leading-snug sm:text-[1.25rem]",
            )}
          >
            {headline}
          </h2>

          {statusMessage ? <div className="mt-2">{statusMessage}</div> : null}
        </div>
      </div>

      {showConversionExtras ? (
        <>
          <div
            className={cn(
              "min-h-0 flex-1 overflow-y-auto overscroll-contain",
              isModal ? "px-4 pt-1" : "mt-2 px-0",
              "[mask-image:linear-gradient(to_bottom,black_0%,black_72%,transparent_100%)]",
              "[-webkit-mask-image:linear-gradient(to_bottom,black_0%,black_72%,transparent_100%)]",
            )}
            aria-label="Vorteile scrollen"
          >
            <div className={contentWidth}>
              <BenefitList compact={compact} />
            </div>
          </div>

          <div
            className={cn(
              "shrink-0 bg-gradient-to-t from-[color:var(--vd-surface)] from-15% via-[color:var(--vd-surface)]/95 to-transparent pt-1",
              isModal ? "px-4" : "",
            )}
          >
            <div className={contentWidth}>
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
          </div>
        </>
      ) : (
        <div className={cn("shrink-0", isModal ? "px-4" : "mt-3")}>
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

      <div className="shrink-0">{ctaSlot}</div>
    </div>
  );
}
