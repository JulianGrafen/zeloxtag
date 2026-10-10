"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useState, useTransition } from "react";
import { X } from "lucide-react";

import { startStripeCheckoutAction } from "@/actions/stripe-checkout";
import { ProPaywallContent } from "@/components/billing/paywall/pro-paywall-content";
import { StickyPaywallCta } from "@/components/billing/paywall/sticky-cta";
import { isAnnualPlanAvailable } from "@/lib/billing/constants";
import { setPaywallOpen } from "@/lib/billing/paywall-open-state";
import {
  getPaywallPersonalization,
  resolvePaywallGoal,
  type PaywallTriggerContext,
} from "@/lib/billing/paywall-personalization";
import {
  PRO_PAYWALL_DISMISS_LABEL,
  PRO_PLAN_CHECKOUT_HEADLINE,
  cloudAboHref,
  type ProBillingInterval,
} from "@/lib/billing/pro-plan";
import { readPrimaryGoal } from "@/lib/onboarding/primary-goal";
import {
  type FeatureFlag,
  type PaywallVariant,
} from "@/lib/permissions/feature-access";

const SHEET_EASE = [0.22, 1, 0.36, 1] as const;

export function ProPaywallModal({
  open,
  feature,
  tagUuid,
  isOwner = true,
  variant = "default",
  triggerContext,
  onClose,
}: {
  open: boolean;
  feature: FeatureFlag | null;
  tagUuid: string;
  isOwner?: boolean;
  variant?: PaywallVariant;
  triggerContext?: PaywallTriggerContext;
  onClose: () => void;
}) {
  const showAnnualPlan = isAnnualPlanAvailable();
  const defaultInterval: ProBillingInterval = "monthly";
  const [interval, setInterval] = useState<ProBillingInterval>(defaultInterval);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();

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

  useEffect(() => {
    const visible = open && Boolean(feature);
    setPaywallOpen(visible);
    return () => setPaywallOpen(false);
  }, [open, feature]);

  const personalization = useMemo(() => {
    if (!open || !feature) return null;
    const goal = resolvePaywallGoal({
      primaryGoal: readPrimaryGoal(),
      feature,
      context: triggerContext,
    });
    return getPaywallPersonalization({ goal, variant });
  }, [open, feature, variant, triggerContext]);

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

  const sheetMotion = reduceMotion
    ? { initial: false as const, animate: { y: 0 }, exit: { y: 0 } }
    : {
        initial: { y: "100%" },
        animate: { y: 0 },
        exit: { y: "100%" },
        transition: { duration: 0.38, ease: SHEET_EASE },
      };

  return (
    <AnimatePresence>
      {open && feature && personalization ? (
        <motion.div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-[color:var(--paywall-modal-scrim)] backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pro-paywall-title"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
        >
          <button
            type="button"
            aria-label="Schließen"
            className="absolute inset-0 cursor-default"
            onClick={onClose}
          />

          <motion.div
            {...sheetMotion}
            className="relative z-10 flex h-[min(50dvh,calc(50vh-env(safe-area-inset-bottom)))] max-h-[50dvh] w-full max-w-lg min-h-0 flex-col overflow-hidden rounded-t-[1.5rem] border border-b-0 border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] text-[color:var(--vd-text)] shadow-[var(--vd-shadow-modal)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div
              className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-[color:var(--vd-border)]"
              aria-hidden
            />

            <button
              type="button"
              onClick={onClose}
              aria-label="Schließen"
              className="absolute top-[max(0.65rem,env(safe-area-inset-top))] right-3 z-20 inline-flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)]/95 text-[color:var(--vd-text)] shadow-sm backdrop-blur-md transition hover:bg-[color:var(--vd-surface)]"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>

            {isOwner ? (
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden pb-[max(0.25rem,env(safe-area-inset-bottom))]">
                <ProPaywallContent
                  layout="modal"
                  interval={interval}
                  onIntervalChange={setInterval}
                  showAnnualPlan={showAnnualPlan}
                  headline={personalization.headline}
                  headlineId="pro-paywall-title"
                  variant={variant}
                  benefits={personalization.benefits}
                  highlightLeadBenefit
                  visualKind={personalization.visualKind}
                  visualAriaLabel={personalization.visualAriaLabel}
                  valueFootnote={personalization.footnote}
                  ctaSlot={
                    <StickyPaywallCta
                      label={personalization.ctaLabel}
                      pending={pending}
                      error={error}
                      microCopy={personalization.stickyMicroCopy}
                      dismissLabel={PRO_PAYWALL_DISMISS_LABEL}
                      onCheckout={handleCheckout}
                      onDismiss={onClose}
                      fixed={false}
                    />
                  }
                />
              </div>
            ) : (
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-8 pb-[max(1rem,env(safe-area-inset-bottom))]">
                <div className="mx-auto w-full max-w-lg">
                  <h2
                    id="pro-paywall-title"
                    className="font-[family-name:var(--font-display)] text-[1.2rem] font-semibold tracking-[-0.03em] text-[color:var(--vd-text)]"
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
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
