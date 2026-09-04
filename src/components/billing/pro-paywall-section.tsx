"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { startStripeCheckoutAction } from "@/actions/stripe-checkout";
import { BenefitList } from "@/components/billing/paywall/benefit-list";
import { PaywallProgress } from "@/components/billing/paywall/paywall-progress";
import { PricingCards } from "@/components/billing/paywall/pricing-cards";
import { StickyPaywallCta } from "@/components/billing/paywall/sticky-cta";
import { TrialBadge } from "@/components/billing/paywall/trial-badge";
import { TrialTimeline } from "@/components/billing/paywall/trial-timeline";
import { StripePortalButton } from "@/components/billing/stripe-checkout-button";
import { isAnnualPlanAvailable } from "@/lib/billing/constants";
import {
  PRO_PAYWALL_FREE_SCAN_EXHAUSTED_KICKER,
  PRO_PAYWALL_MODAL_SUBLINE,
  PRO_PLAN_CHECKOUT_HEADLINE,
  PRO_PLAN_NAME,
  proCheckoutButtonLabel,
  type ProBillingInterval,
  type ProCheckoutAudience,
} from "@/lib/billing/pro-plan";
import {
  FEATURE,
  paywallBody,
  paywallTitle,
  type FeatureFlag,
  type PaywallVariant,
} from "@/lib/permissions/feature-access";

type ProPaywallSectionProps = {
  successPath: string;
  cancelPath: string;
  audience?: ProCheckoutAudience;
  showPortal?: boolean;
  feature?: FeatureFlag;
  variant?: PaywallVariant;
  dismissHref?: string;
  dismissLabel?: string;
  statusMessage?: React.ReactNode;
};

export function ProPaywallSection({
  successPath,
  cancelPath,
  audience = "new",
  showPortal = false,
  feature = FEATURE.DOCUMENT_VAULT,
  variant = "default",
  dismissHref,
  dismissLabel = "Weiter mit der kostenlosen Visitenkarte",
  statusMessage,
}: ProPaywallSectionProps) {
  const showAnnualPlan = isAnnualPlanAvailable();
  const defaultInterval: ProBillingInterval = showAnnualPlan ? "annual" : "monthly";
  const [interval, setInterval] = useState<ProBillingInterval>(defaultInterval);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const useConversionCopy = variant === "default";
  const headline = useConversionCopy
    ? PRO_PLAN_CHECKOUT_HEADLINE
    : paywallTitle(feature, variant);
  const subline = useConversionCopy
    ? PRO_PAYWALL_MODAL_SUBLINE
    : paywallBody(feature, variant);

  function handleCheckout() {
    setError(null);
    startTransition(async () => {
      const result = await startStripeCheckoutAction({
        successPath,
        cancelPath,
        interval,
      });
      if (result.status === "ok") {
        window.location.assign(result.url);
        return;
      }
      if (result.status === "active") {
        window.location.assign(successPath);
        return;
      }
      setError(result.message);
    });
  }

  return (
    <section
      aria-label="ZeloxTag Pro"
      className="rounded-[1.75rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-5 shadow-[var(--vd-shadow-sm)]"
    >
      <div className="vd-anim-header">
        <p className="claim-kicker">{PRO_PLAN_NAME}</p>

        {variant === "free_scan_exhausted" ? (
          <p className="mt-3 inline-flex rounded-full bg-amber-50 px-3 py-1 text-[0.72rem] font-semibold tracking-[0.06em] text-amber-900 uppercase">
            {PRO_PAYWALL_FREE_SCAN_EXHAUSTED_KICKER}
          </p>
        ) : null}

        {useConversionCopy ? (
          <>
            <PaywallProgress />
            <TrialBadge />
          </>
        ) : null}

        <h2 className="claim-title mt-4 text-[1.75rem] font-bold sm:text-[1.95rem]">
          {headline}
        </h2>
        <p className="claim-copy mt-2 text-[0.88rem]">{subline}</p>

        {statusMessage ? <div className="mt-3">{statusMessage}</div> : null}

        {useConversionCopy ? (
          <>
            <BenefitList />
            <TrialTimeline />
          </>
        ) : null}

        <PricingCards
          interval={interval}
          onIntervalChange={setInterval}
          showAnnualPlan={showAnnualPlan}
        />
      </div>

      <StickyPaywallCta
        label={proCheckoutButtonLabel(audience, interval)}
        pending={pending}
        error={error}
        fixed={false}
        onCheckout={handleCheckout}
      />

      {showPortal ? <StripePortalButton returnPath={successPath} /> : null}

      {dismissHref ? (
        <Link href={dismissHref} className="claim-later mt-4 inline-block w-full text-center">
          {dismissLabel}
        </Link>
      ) : null}
    </section>
  );
}
