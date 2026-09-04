import Link from "next/link";

import { ProPlanBenefits } from "@/components/billing/pro-plan-benefits";
import { StripeCheckoutButton } from "@/components/billing/stripe-checkout-button";
import { isAnnualPlanConfigured } from "@/lib/billing/stripe";
import {
  PRO_PLAN_NAME,
  PRO_TRIAL_HEADLINE,
  PRO_TRIAL_PRICE_COPY,
  PRO_ANNUAL_PRICE_COPY,
} from "@/lib/billing/pro-plan";

export function ActivateCloudView({ tagUuid }: { tagUuid: string }) {
  const dashboardHref = `/v/${tagUuid}`;
  const aboHref = `/v/${tagUuid}/abo`;
  const showAnnualPlan = isAnnualPlanConfigured();

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col px-4 pb-10 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-5">
      <section className="claim-panel">
        <header>
          <p className="claim-kicker">{PRO_PLAN_NAME}</p>
          <h1 className="claim-title mt-2">Abo abschließen</h1>
          <p className="claim-copy mt-2">
            {PRO_TRIAL_HEADLINE} {PRO_TRIAL_PRICE_COPY} Oder{" "}
            {PRO_ANNUAL_PRICE_COPY.toLowerCase()}. Die digitale Visitenkarte bleibt
            kostenlos. KI-Scan, Dokumentenakte und Verkaufs-Exposé gehören zu Pro.
          </p>
        </header>

        <ProPlanBenefits audience="new" showLead={false} />

        <div className="mt-4">
          <StripeCheckoutButton
            successPath={dashboardHref}
            cancelPath={aboHref}
            audience="new"
            showAnnualPlan={showAnnualPlan}
          />
        </div>

        <Link href={dashboardHref} className="claim-later mt-4">
          Zurück zur kostenlosen Visitenkarte
        </Link>
      </section>
    </div>
  );
}
