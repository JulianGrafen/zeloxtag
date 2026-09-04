"use client";

import { useState, useTransition } from "react";

import { startStripeCheckoutAction } from "@/actions/stripe-checkout";
import { ProPaywallContent } from "@/components/billing/paywall/pro-paywall-content";
import { StickyPaywallCta } from "@/components/billing/paywall/sticky-cta";
import { StripePortalButton } from "@/components/billing/stripe-checkout-button";
import { isAnnualPlanAvailable } from "@/lib/billing/constants";
import {
  PRO_SETTINGS_PAYWALL_HEADLINE,
  PRO_SETTINGS_PAYWALL_KICKER,
  PRO_PAYWALL_STICKY_MICROCOPY,
  proCheckoutButtonLabel,
  type ProBillingInterval,
  type ProCheckoutAudience,
} from "@/lib/billing/pro-plan";

type SettingsPaywallSectionProps = {
  successPath?: string;
  cancelPath?: string;
  audience?: ProCheckoutAudience;
  showPortal?: boolean;
  statusMessage?: React.ReactNode;
};

export function SettingsPaywallSection({
  successPath = "/settings",
  cancelPath = "/settings",
  audience = "new",
  showPortal = false,
  statusMessage,
}: SettingsPaywallSectionProps) {
  const showAnnualPlan = isAnnualPlanAvailable();
  const defaultInterval: ProBillingInterval = "monthly";
  const [interval, setInterval] = useState<ProBillingInterval>(defaultInterval);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

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
      aria-label="Mitgliedschaft"
      className="rounded-[1.75rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-5 shadow-[var(--vd-shadow-sm)]"
    >
      <p className="text-[0.65rem] font-medium uppercase tracking-[0.2em] text-[color:var(--vd-muted)]">
        {PRO_SETTINGS_PAYWALL_KICKER}
      </p>

      <ProPaywallContent
        layout="settings"
        interval={interval}
        onIntervalChange={setInterval}
        showAnnualPlan={showAnnualPlan}
        headline={PRO_SETTINGS_PAYWALL_HEADLINE}
        statusMessage={statusMessage}
        ctaSlot={
          <>
            <StickyPaywallCta
              label={proCheckoutButtonLabel(audience, interval)}
              microCopy={PRO_PAYWALL_STICKY_MICROCOPY}
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
