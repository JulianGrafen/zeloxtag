"use client";

import type { ReactNode } from "react";

import { PaywallFeatureRows } from "@/components/billing/paywall/paywall-feature-rows";
import { PricingCards } from "@/components/billing/paywall/pricing-cards";
import { TrialTimeline } from "@/components/billing/paywall/trial-timeline";
import type { ProBillingInterval } from "@/lib/billing/pro-plan";
import {
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
        className="inline-flex rounded-full bg-[color:var(--paywall-kicker-bg)] px-3 py-1 text-[0.68rem] font-semibold tracking-[0.06em] text-[color:var(--paywall-kicker-text)] uppercase"
      >
        {PRO_PAYWALL_FREE_SCAN_EXHAUSTED_KICKER}
      </span>
    </p>
  );
}

export function PaywallCopyBlock({
  headline,
  headlineId,
  subline = PRO_PAYWALL_MODAL_SUBLINE,
  vehicleEyebrow,
  align = "center",
  kicker,
  statusMessage,
  titleSize = "modal",
}: {
  headline: string;
  headlineId?: string;
  subline?: string;
  vehicleEyebrow?: string | null;
  align?: "center" | "start";
  kicker?: ReactNode;
  statusMessage?: ReactNode;
  titleSize?: "modal" | "section";
}) {
  const centered = align === "center";

  return (
    <div
      className={cn(
        "vd-anim-header space-y-2",
        centered ? "text-center" : "text-left",
      )}
    >
      {kicker}
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
          "font-[family-name:var(--font-display)] font-semibold tracking-[-0.03em] text-[color:var(--vd-text)]",
          titleSize === "modal"
            ? "text-[1.28rem] leading-tight sm:text-[1.38rem]"
            : "text-[1.12rem] leading-snug sm:text-[1.2rem]",
        )}
      >
        {headline}
      </h2>
      {subline ? (
        <p
          className={cn(
            "text-[0.84rem] leading-relaxed text-[color:var(--vd-muted)]",
            centered ? "mx-auto max-w-[22rem]" : "",
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
  valueFootnote,
  belowFoldFooter,
  compact = true,
  className,
}: {
  benefits?: readonly string[];
  highlightLeadBenefit?: boolean;
  interval: ProBillingInterval;
  onIntervalChange: (interval: ProBillingInterval) => void;
  showAnnualPlan: boolean;
  valueFootnote?: string;
  belowFoldFooter?: ReactNode;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <PaywallFeatureRows
        items={benefits}
        highlightFirst={highlightLeadBenefit}
      />

      <div
        className="flex flex-col gap-3 border-t border-[color:var(--vd-border)] pt-4"
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

      {valueFootnote ? (
        <p className="px-0.5 text-center text-[0.78rem] leading-snug text-[color:var(--vd-muted)]">
          {valueFootnote}
        </p>
      ) : null}

      {belowFoldFooter ? <div className="shrink-0">{belowFoldFooter}</div> : null}
    </div>
  );
}
