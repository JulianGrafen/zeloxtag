"use client";

import type { ReactNode } from "react";

import { PaywallFeatureRows } from "@/components/billing/paywall/paywall-feature-rows";
import { PricingCards } from "@/components/billing/paywall/pricing-cards";
import type { ProBillingInterval } from "@/lib/billing/pro-plan";
import {
  PRO_FREE_KI_SCAN_HOOK,
  PRO_PAYWALL_BRAND_BADGE,
  PRO_PAYWALL_FREE_SCAN_EXHAUSTED_KICKER,
  PRO_PAYWALL_MODAL_BENEFITS,
  PRO_PAYWALL_MODAL_SUBLINE,
} from "@/lib/billing/pro-plan";
import { cn } from "@/lib/utils";

export function PaywallFreeScanOfferKicker({
  className,
  align = "center",
}: {
  className?: string;
  align?: "center" | "start";
}) {
  return (
    <p className={cn(align === "center" ? "text-center" : "text-left", className)}>
      <span
        className="inline-flex rounded-full border border-[color:var(--paywall-trial-border)] bg-[color:var(--paywall-trial-bg)] px-3 py-1 text-[12px] font-medium tracking-[-0.01em] text-[color:var(--paywall-trial-text)]"
      >
        {PRO_FREE_KI_SCAN_HOOK}
      </span>
    </p>
  );
}

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
  tone = "default",
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
  /** White type over the vehicle hero fade (dashboard-style). */
  tone?: "default" | "hero-overlay";
}) {
  const centered = align === "center";
  const onHero = tone === "hero-overlay";

  return (
    <div
      className={cn(
        "paywall-copy space-y-2",
        centered ? "text-center" : "text-left",
      )}
    >
      {kicker}
      {showProBadge ? <PaywallProBrandBadge align={align} /> : null}
      {vehicleEyebrow ? (
        <p
          className={cn(
            "text-[0.8rem] font-semibold tracking-[-0.02em]",
            onHero ? "text-white/85 drop-shadow-sm" : "text-[color:var(--vd-text)]",
            centered ? "mx-auto max-w-[22rem]" : "",
          )}
        >
          {vehicleEyebrow}
        </p>
      ) : null}
      <h2
        id={headlineId}
        className={cn(
          "paywall-headline font-[family-name:var(--font-display)] font-bold tracking-[-0.03em]",
          onHero
            ? "text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.45)]"
            : "text-[color:var(--vd-text)]",
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
            "paywall-subline text-[0.8125rem] leading-[1.35]",
            onHero ? "text-zinc-300 drop-shadow-sm" : "text-[color:var(--vd-muted)]",
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
  embeddedInCard = false,
  className,
}: {
  benefits?: readonly string[];
  highlightLeadBenefit?: boolean;
  interval: ProBillingInterval;
  onIntervalChange: (interval: ProBillingInterval) => void;
  showAnnualPlan: boolean;
  belowFoldFooter?: ReactNode;
  compact?: boolean;
  /** Sections inside one rounded paywall card — flat cells, dividers only. */
  embeddedInCard?: boolean;
  className?: string;
}) {
  return (
    <div className={cn(embeddedInCard ? "flex flex-col" : "flex flex-col gap-3", className)}>
      <PaywallFeatureRows
        items={benefits}
        highlightFirst={highlightLeadBenefit}
        className={
          embeddedInCard
            ? "rounded-none border-t border-[color:var(--paywall-grouped-separator)] bg-transparent ring-0"
            : undefined
        }
      />

      <div
        className={cn(
          "flex flex-col",
          embeddedInCard
            ? "gap-0 border-t border-[color:var(--paywall-grouped-separator)]"
            : "gap-3",
        )}
        aria-label="Preise und Free-Tier"
      >
        <PricingCards
          interval={interval}
          onIntervalChange={onIntervalChange}
          showAnnualPlan={showAnnualPlan}
          compact={compact}
          embeddedInCard={embeddedInCard}
          className="!mt-0"
        />
      </div>

      {belowFoldFooter ? <div className="shrink-0">{belowFoldFooter}</div> : null}
    </div>
  );
}
