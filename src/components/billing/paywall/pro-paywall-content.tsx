"use client";

import { PaywallAnimatedGoalVisual } from "@/components/billing/paywall/paywall-animated-goal-visual";
import {
  PaywallCopyBlock,
  PaywallExhaustedKicker,
  PaywallOfferSections,
} from "@/components/billing/paywall/paywall-layout";
import type {
  PaywallVehicleHeroContext,
  PaywallVisualKind,
} from "@/lib/billing/paywall-personalization";
import { PricingCards } from "@/components/billing/paywall/pricing-cards";
import {
  PRO_PAYWALL_MODAL_BENEFITS,
  PRO_PAYWALL_MODAL_SUBLINE,
  type ProBillingInterval,
} from "@/lib/billing/pro-plan";
import { PAYWALL_APPLE_CLASS } from "@/lib/billing/paywall-apple";
import type { PaywallVariant } from "@/lib/permissions/feature-access";
import { cn } from "@/lib/utils";

export type ProPaywallLayout = "modal" | "section";

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
  benefits?: readonly string[];
  highlightLeadBenefit?: boolean;
  visualKind?: PaywallVisualKind;
  visualAriaLabel?: string;
  vehicleHero?: PaywallVehicleHeroContext | null;
  vehicleEyebrow?: string | null;
  subline?: string;
};

const DEFAULT_VISUAL_ARIA =
  "Umbau-Werthaltung: mit lückenloser Dokumentation höherer Verkaufswert";

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
  benefits = PRO_PAYWALL_MODAL_BENEFITS,
  highlightLeadBenefit = false,
  visualKind = "vehicle_hero",
  visualAriaLabel,
  vehicleHero = null,
  vehicleEyebrow = null,
  subline = PRO_PAYWALL_MODAL_SUBLINE,
}: ProPaywallContentProps) {
  const compact = true;
  const isModal = layout === "modal";
  const showExhaustedKicker = variant === "free_scan_exhausted";
  const kicker = showExhaustedKicker ? <PaywallExhaustedKicker /> : null;

  const offerSections = (
    <PaywallOfferSections
      benefits={benefits}
      highlightLeadBenefit={highlightLeadBenefit}
      interval={interval}
      onIntervalChange={onIntervalChange}
      showAnnualPlan={showAnnualPlan}
      belowFoldFooter={belowFoldFooter}
      compact={compact}
    />
  );

  return (
    <div
      className={cn(
        PAYWALL_APPLE_CLASS,
        "flex min-h-0 flex-col",
        isModal ? "h-full min-h-0 flex-1" : "gap-4",
      )}
    >
      {showConversionExtras ? (
        isModal ? (
          <div
            className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain pb-2 [-webkit-overflow-scrolling:touch] [scrollbar-gutter:stable]"
            aria-label="Pro-Angebot scrollen"
          >
            <div className="relative shrink-0 px-4 pt-4 sm:pt-5">
              <PaywallAnimatedGoalVisual
                kind={visualKind}
                ariaLabel={visualAriaLabel ?? DEFAULT_VISUAL_ARIA}
                vehicleHero={vehicleHero}
                className={cn(
                  "overflow-hidden rounded-[1.25rem]",
                  "pt-[max(2.25rem,calc(env(safe-area-inset-top)+1.5rem))]",
                )}
                figureClassName="min-h-[12.5rem] sm:min-h-[13.5rem] pb-1"
              />
              <div className="pointer-events-none absolute inset-x-4 bottom-0 z-10 px-4 pb-4 pt-20">
                <PaywallCopyBlock
                  headline={headline}
                  headlineId={headlineId}
                  subline={subline}
                  vehicleEyebrow={vehicleEyebrow}
                  align="center"
                  kicker={kicker}
                  statusMessage={statusMessage}
                  titleSize="modal"
                  tone="hero-overlay"
                />
              </div>
            </div>

            <div className="mx-auto w-full max-w-lg space-y-4 px-4 pt-3">
              {offerSections}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <PaywallCopyBlock
              headline={headline}
              headlineId={headlineId}
              subline={subline}
              vehicleEyebrow={vehicleEyebrow}
              align="start"
              kicker={
                showExhaustedKicker ? (
                  <PaywallExhaustedKicker align="start" />
                ) : null
              }
              statusMessage={statusMessage}
              titleSize="section"
            />
            <PaywallAnimatedGoalVisual
              kind={visualKind}
              ariaLabel={visualAriaLabel ?? DEFAULT_VISUAL_ARIA}
              vehicleHero={vehicleHero}
              className="overflow-hidden rounded-2xl bg-[color:var(--paywall-grouped-bg)] ring-1 ring-[color:var(--paywall-grouped-separator)]"
            />
            {offerSections}
          </div>
        )
      ) : (
        <div className={cn("shrink-0", isModal ? "px-4" : "")}>
          <div className={cn(isModal ? "mx-auto w-full max-w-lg" : "")}>
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

      <div
        className={cn("relative z-20 shrink-0", isModal ? "mt-auto" : "mt-1")}
      >
        {ctaSlot}
      </div>
    </div>
  );
}
