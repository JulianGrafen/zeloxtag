"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";

import { startStripeCheckoutAction } from "@/actions/stripe-checkout";
import { ProPaywallContent } from "@/components/billing/paywall/pro-paywall-content";
import { StickyPaywallCta } from "@/components/billing/paywall/sticky-cta";
import { StripePortalButton } from "@/components/billing/stripe-checkout-button";
import { isAnnualPlanAvailable } from "@/lib/billing/constants";
import {
  getPaywallPersonalization,
  resolvePaywallGoal,
} from "@/lib/billing/paywall-personalization";
import {
  PRO_PAYWALL_DISMISS_LABEL,
  PRO_PLAN_CHECKOUT_HEADLINE,
  proCheckoutButtonLabel,
  type ProBillingInterval,
  type ProCheckoutAudience,
} from "@/lib/billing/pro-plan";
import { readPrimaryGoal } from "@/lib/onboarding/primary-goal";
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
  vehicleLabel?: string | null;
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
  vehicleLabel = null,
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
  const fallbackHeadline = useConversionCopy
    ? PRO_PLAN_CHECKOUT_HEADLINE
    : paywallTitle(feature, variant);

  const personalization = useMemo(() => {
    if (!useConversionCopy) return null;
    const goal = resolvePaywallGoal({
      primaryGoal: readPrimaryGoal(),
      feature,
    });
    return getPaywallPersonalization({ goal, variant, vehicleLabel });
  }, [feature, useConversionCopy, variant, vehicleLabel]);

  const headline = personalization?.headline ?? fallbackHeadline;

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
      className="zt-feature-panel p-4 shadow-[var(--vd-shadow-sm)] sm:p-5"
    >
      <ProPaywallContent
        layout="section"
        interval={interval}
        onIntervalChange={setInterval}
        showAnnualPlan={showAnnualPlan}
        headline={headline}
        subline={personalization?.subline}
        vehicleEyebrow={personalization?.vehicleEyebrow ?? null}
        showConversionExtras={useConversionCopy}
        variant={variant}
        benefits={personalization?.benefits}
        highlightLeadBenefit={Boolean(personalization)}
        visualKind={personalization?.visualKind}
        visualAriaLabel={personalization?.visualAriaLabel}
        valueFootnote={personalization?.footnote}
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
              label={
                personalization?.ctaLabel ??
                proCheckoutButtonLabel(audience, interval)
              }
              microCopy={personalization?.stickyMicroCopy ?? ""}
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
