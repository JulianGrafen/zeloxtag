"use client";

import Link from "next/link";

import { ProPlanBenefits } from "@/components/billing/pro-plan-benefits";
import {
  StripeCheckoutButton,
  StripePortalButton,
} from "@/components/billing/stripe-checkout-button";
import { isAnnualPlanAvailable } from "@/lib/billing/constants";
import {
  PRO_PLAN_CHECKOUT_HEADLINE,
  PRO_PLAN_CHECKOUT_SUBLINE,
  PRO_PLAN_NAME,
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
  const headline =
    variant === "default" ? PRO_PLAN_CHECKOUT_HEADLINE : paywallTitle(feature, variant);
  const subline =
    variant === "default" ? PRO_PLAN_CHECKOUT_SUBLINE : paywallBody(feature, variant);

  return (
    <section
      aria-label="ZeloxTag Pro"
      className="rounded-[1.75rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-5 shadow-[var(--vd-shadow-sm)]"
    >
      <p className="claim-kicker">{PRO_PLAN_NAME}</p>
      <h2 className="claim-title mt-2 text-[1.75rem] font-bold sm:text-[1.95rem]">
        {headline}
      </h2>
      <p className="claim-copy mt-2 text-[0.88rem]">{subline}</p>

      {statusMessage ? <div className="mt-3">{statusMessage}</div> : null}

      <ProPlanBenefits audience={audience} showLead={false} />

      <StripeCheckoutButton
        successPath={successPath}
        cancelPath={cancelPath}
        audience={audience}
        showAnnualPlan={showAnnualPlan}
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
