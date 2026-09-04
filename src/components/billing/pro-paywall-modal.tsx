"use client";

import { useEffect, useState, useTransition } from "react";
import { X } from "lucide-react";

import { startStripeCheckoutAction } from "@/actions/stripe-checkout";
import { ProPaywallContent } from "@/components/billing/paywall/pro-paywall-content";
import { StickyPaywallCta } from "@/components/billing/paywall/sticky-cta";
import { isAnnualPlanAvailable } from "@/lib/billing/constants";
import {
  PRO_PAYWALL_DISMISS_LABEL,
  PRO_PAYWALL_MODAL_MICROCOPY,
  PRO_PLAN_CHECKOUT_HEADLINE,
  cloudAboHref,
  type ProBillingInterval,
} from "@/lib/billing/pro-plan";
import {
  type FeatureFlag,
  type PaywallVariant,
} from "@/lib/permissions/feature-access";

export function ProPaywallModal({
  open,
  feature,
  tagUuid,
  isOwner = true,
  variant = "default",
  onClose,
}: {
  open: boolean;
  feature: FeatureFlag | null;
  tagUuid: string;
  isOwner?: boolean;
  variant?: PaywallVariant;
  onClose: () => void;
}) {
  const showAnnualPlan = isAnnualPlanAvailable();
  const defaultInterval: ProBillingInterval = "monthly";
  const [interval, setInterval] = useState<ProBillingInterval>(defaultInterval);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setInterval(defaultInterval);
    setError(null);
  }, [open, defaultInterval]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open || !feature) return null;

  const aboHref = cloudAboHref(tagUuid);
  const successPath = `/v/${tagUuid}`;

  function handleCheckout() {
    setError(null);
    startTransition(async () => {
      const result = await startStripeCheckoutAction({
        successPath,
        cancelPath: aboHref,
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
    <div
      className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pro-paywall-title"
    >
      <button
        type="button"
        aria-label="Schließen"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />

      <div className="relative z-10 flex h-full max-h-[100dvh] min-h-0 flex-col overflow-hidden bg-[color:var(--vd-surface)]/92 text-[color:var(--vd-text)] shadow-[var(--vd-shadow-modal)] backdrop-blur-2xl supports-[backdrop-filter]:bg-[color:var(--vd-surface)]/88">
        <button
          type="button"
          onClick={onClose}
          aria-label="Schließen"
          className="absolute top-[max(0.75rem,env(safe-area-inset-top))] right-4 z-20 inline-flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)]/90 text-[color:var(--vd-text)] shadow-sm backdrop-blur-md transition hover:bg-[color:var(--vd-surface)]"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>

        {isOwner ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <ProPaywallContent
              layout="modal"
              interval={interval}
              onIntervalChange={setInterval}
              showAnnualPlan={showAnnualPlan}
              headline={PRO_PLAN_CHECKOUT_HEADLINE}
              headlineId="pro-paywall-title"
              variant={variant}
              ctaSlot={
                <StickyPaywallCta
                  pending={pending}
                  error={error}
                  microCopy={PRO_PAYWALL_MODAL_MICROCOPY}
                  dismissLabel={PRO_PAYWALL_DISMISS_LABEL}
                  onCheckout={handleCheckout}
                  onDismiss={onClose}
                  fixed={false}
                />
              }
            />
          </div>
        ) : (
          <div className="flex flex-1 flex-col px-4 pt-14 pb-8">
            <div className="mx-auto w-full max-w-lg">
              <h2
                id="pro-paywall-title"
                className="font-[family-name:var(--font-display)] text-[1.35rem] font-semibold tracking-[-0.03em] text-[color:var(--vd-text)] sm:text-[1.5rem]"
              >
                {PRO_PLAN_CHECKOUT_HEADLINE}
              </h2>
              <p className="claim-copy mt-2 text-[0.88rem] leading-relaxed">
                Der Fahrzeughalter muss ZeloxTag Pro aktivieren, bevor diese
                Funktion verfügbar ist.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="claim-later mt-6 w-full rounded-xl px-3 py-2.5"
              >
                Zurück zum Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
