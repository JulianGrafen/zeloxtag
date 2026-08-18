import { AppShell } from "@/components/layout/app-shell";
import { BackNav } from "@/components/layout/back-nav";
import { ScanContent } from "@/components/layout/scan-content";
import { ProPlanBenefits } from "@/components/billing/pro-plan-benefits";
import { StripeCheckoutButton } from "@/components/billing/stripe-checkout-button";
import {
  cloudAboHref,
  proCheckoutButtonLabel,
} from "@/lib/billing/pro-plan";
import {
  paywallBody,
  paywallTitle,
  type FeatureFlag,
} from "@/lib/permissions/feature-access";
import { ownerHasFeature } from "@/lib/permissions/require-feature";

export async function ProFeatureGate({
  ownerUserId,
  tagUuid,
  feature,
  children,
}: {
  ownerUserId: string;
  tagUuid: string;
  feature: FeatureFlag;
  children: React.ReactNode;
}) {
  if (await ownerHasFeature(ownerUserId, feature)) {
    return children;
  }

  const aboHref = cloudAboHref(tagUuid);

  return (
    <AppShell showNavbar={false}>
      <ScanContent>
        <BackNav label="Dashboard" href={`/v/${tagUuid}`} />
        <div className="claim-panel">
          <p className="claim-kicker">ZeloxTag Pro</p>
          <h1 className="claim-title mt-2">{paywallTitle(feature)}</h1>
          <p className="claim-copy mt-2">{paywallBody(feature)}</p>
          <ProPlanBenefits audience="new" showLead={false} />
          <StripeCheckoutButton
            successPath={`/v/${tagUuid}?tour=1`}
            cancelPath={aboHref}
            label={proCheckoutButtonLabel("new")}
          />
        </div>
      </ScanContent>
    </AppShell>
  );
}

export async function wrapProFeature({
  isDemo,
  ownerUserId,
  tagUuid,
  feature,
  children,
}: {
  isDemo?: boolean;
  ownerUserId: string;
  tagUuid: string;
  feature: FeatureFlag;
  children: React.ReactNode;
}) {
  if (isDemo) return children;
  return (
    <ProFeatureGate
      ownerUserId={ownerUserId}
      tagUuid={tagUuid}
      feature={feature}
    >
      {children}
    </ProFeatureGate>
  );
}
