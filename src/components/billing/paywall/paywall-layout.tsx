"use client";

import type { ReactNode } from "react";

import { PaywallFeatureRows } from "@/components/billing/paywall/paywall-feature-rows";
import { PricingCards } from "@/components/billing/paywall/pricing-cards";
import { TrialTimeline } from "@/components/billing/paywall/trial-timeline";
import type { ProBillingInterval } from "@/lib/billing/pro-plan";
import {
  PRO_PAYWALL_BRAND_BADGE,
  PRO_PAYWALL_FREE_SCAN_EXHAUSTED_KICKER,
  PRO_PAYWALL_MODAL_BENEFITS,
  PRO_PAYWALL_MODAL_SUBLINE,
} from "@/lib/billing/pro-plan";
import { cn } from "@/lib/utils";

export function PaywallExhaustedKicker({
  className,
  align = "center",
}: {
  className?: string;
  align?: "center" | "start";
}) {
  return (
    <p className={cn(align === "center" ? "text-center" : "text-left", className)}>
      <span
        className="inline-flex rounded-full bg-[color:var(--paywall-grouped-bg)] px-3 py-1 text-[12px] font-medium tracking-[-0.01em] text-[color:var(--vd-muted)]"
      >
        {PRO_PAYWALL_FREE_SCAN_EXHAUSTED_KICKER}
      </span>
    </p>
  );
}

export function PaywallProBrandBadge({
  className,
  align = "center",
}: {
  className?: string;
  align?: "center" | "start";
}) {
  return (
    <p className={cn(align === "center" ? "text-center" : "text-left", className)}>
      <span
        className="inline-flex rounded-full border border-[color:var(--paywall-kicker-bg)] bg-[color:var(--paywall-kicker-bg)]/40 px-3 py-1 text-[0.62rem] font-bold tracking-[0.28em] text-[color:var(--paywall-kicker-text)] uppercase"
      >
        {PRO_PAYWALL_BRAND_BADGE}
      </span>
    </p>
  );
}

export function PaywallCopyBlock({
  headline,
  headlineId,
  subline = PRO_PAYWALL_MODAL_SUBLINE,
  vehicleEyebrow,
  showProBadge = false,
  align = "center",
  kicker,
  statusMessage,
  titleSize = "modal",
}: {
  headline: string;
  headlineId?: string;
  subline?: string;
  vehicleEyebrow?: string | null;
  showProBadge?: boolean;
  align?: "center" | "start";
  kicker?: ReactNode;
  statusMessage?: ReactNode;
  titleSize?: "modal" | "section";
}) {
  const centered = align === "center";

  return (
    <div
      className={cn(
        "vd-anim-header paywall-copy space-y-2",
        centered ? "text-center" : "text-left",
      )}
    >
      {kicker}
      {showProBadge ? <PaywallProBrandBadge align={align} /> : null}
      {vehicleEyebrow ? (
        <p
          className={cn(
            "text-[0.8rem] font-semibold tracking-[-0.02em] text-[color:var(--vd-text)]",
            centered ? "mx-auto max-w-[22rem]" : "",
          )}
        >
          {vehicleEyebrow}
        </p>
      ) : null}
      <h2
        id={headlineId}
        className={cn(
          "paywall-headline font-[family-name:var(--font-display)] font-bold tracking-[-0.03em] text-[color:var(--vd-text)]",
          titleSize === "modal"
            ? "text-[1.375rem] leading-[1.15] sm:text-[1.5rem]"
            : "text-[1.25rem] leading-snug",
        )}
      >
        {headline}
      </h2>
      {subline ? (
        <p
          className={cn(
            "paywall-subline text-[0.8125rem] leading-[1.35] text-[color:var(--vd-muted)]",
            centered ? "mx-auto max-w-[20rem]" : "",
          )}
        >
          {subline}
        </p>
      ) : null}
      {statusMessage ? <div className="pt-0.5">{statusMessage}</div> : null}
    </div>
  );
}

export function PaywallOfferSections({
  benefits = PRO_PAYWALL_MODAL_BENEFITS,
  highlightLeadBenefit = false,
  interval,
  onIntervalChange,
  showAnnualPlan,
  belowFoldFooter,
  compact = true,
  className,
}: {
  benefits?: readonly string[];
  highlightLeadBenefit?: boolean;
  interval: ProBillingInterval;
  onIntervalChange: (interval: ProBillingInterval) => void;
  showAnnualPlan: boolean;
  belowFoldFooter?: ReactNode;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <PaywallFeatureRows
        items={benefits}
        highlightFirst={highlightLeadBenefit}
      />

      <div
        className="flex flex-col gap-3"
        aria-label="Preise und Testphase"
      >
        <PricingCards
          interval={interval}
          onIntervalChange={onIntervalChange}
          showAnnualPlan={showAnnualPlan}
          compact={compact}
          className="!mt-0"
        />
        <TrialTimeline compact={compact} />
      </div>

      {belowFoldFooter ? <div className="shrink-0">{belowFoldFooter}</div> : null}
    </div>
  );
}
