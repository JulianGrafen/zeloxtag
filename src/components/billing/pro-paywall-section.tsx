"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { startStripeCheckoutAction } from "@/actions/stripe-checkout";
import { ProPaywallContent } from "@/components/billing/paywall/pro-paywall-content";
import { StickyPaywallCta } from "@/components/billing/paywall/sticky-cta";
import { StripePortalButton } from "@/components/billing/stripe-checkout-button";
import { isAnnualPlanAvailable } from "@/lib/billing/constants";
import {
  PRO_PAYWALL_DISMISS_LABEL,
  PRO_PLAN_CHECKOUT_HEADLINE,
  proCheckoutButtonLabel,
  type ProBillingInterval,
  type ProCheckoutAudience,
} from "@/lib/billing/pro-plan";
import {
  FEATURE,
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
  dismissLabel = PRO_PAYWALL_DISMISS_LABEL,
  statusMessage,
}: ProPaywallSectionProps) {
  const showAnnualPlan = isAnnualPlanAvailable();
  const defaultInterval: ProBillingInterval = "monthly";
  const [interval, setInterval] = useState<ProBillingInterval>(defaultInterval);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const useConversionCopy = variant === "default";
  const headline = useConversionCopy
    ? PRO_PLAN_CHECKOUT_HEADLINE
    : paywallTitle(feature, variant);

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
      <ProPaywallContent
        layout="section"
        interval={interval}
        onIntervalChange={setInterval}
        showAnnualPlan={showAnnualPlan}
        headline={headline}
        showConversionExtras={useConversionCopy}
        variant={variant}
        statusMessage={statusMessage}
        belowFoldFooter={
          dismissHref ? (
            <Link href={dismissHref} className="claim-later mt-4 inline-block w-full text-center">
              {dismissLabel}
            </Link>
          ) : null
        }
        ctaSlot={
          <>
            <StickyPaywallCta
              label={proCheckoutButtonLabel(audience, interval)}
              pending={pending}
              error={error}
              fixed={false}
              onCheckout={handleCheckout}
            />
            {showPortal ? <StripePortalButton returnPath={successPath} /> : null}
          </>
        }
      />
    </section>
  );
}
