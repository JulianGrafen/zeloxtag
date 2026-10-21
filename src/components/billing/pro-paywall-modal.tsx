"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useState, useTransition } from "react";
import { X } from "lucide-react";

import { mapProIntervalToPlanType } from "@/services/platform/billing/plan-type";
import { usePlatformServices } from "@/services/platform/context/platform-services-context";
import { ProPaywallContent } from "@/components/billing/paywall/pro-paywall-content";
import { StickyPaywallCta } from "@/components/billing/paywall/sticky-cta";
import { isAnnualPlanAvailable } from "@/lib/billing/constants";
import { setPaywallOpen } from "@/lib/billing/paywall-open-state";
import {
  getPaywallPersonalization,
  paywallVehicleHeroFromContext,
  resolvePaywallGoal,
  type PaywallTriggerContext,
  type PaywallVehicleHeroContext,
} from "@/lib/billing/paywall-personalization";
import {
  PAYWALL_APPLE_CLASS,
  PAYWALL_SHEET_TOP_RADIUS_CLASS,
} from "@/lib/billing/paywall-apple";
import {
  PRO_PAYWALL_DISMISS_LABEL,
  PRO_PLAN_CHECKOUT_HEADLINE,
  cloudAboHref,
  proCheckoutButtonLabel,
  proCheckoutMicroCopy,
  proCheckoutPendingLabel,
  type ProBillingInterval,
} from "@/lib/billing/pro-plan";
import { readPrimaryGoal } from "@/lib/onboarding/primary-goal";
import {
  type FeatureFlag,
  type PaywallVariant,
} from "@/lib/permissions/feature-access";
import { cn } from "@/lib/utils";

/** iOS-like sheet: ease-out, no overshoot */
const PAYWALL_EASE = [0.25, 0.1, 0.25, 1] as const;
const PAYWALL_SHEET_MS = 0.32;
const PAYWALL_SCRIM_MS = 0.22;

export function ProPaywallModal({
  open,
  feature,
  tagUuid,
  isOwner = true,
  variant = "default",
  triggerContext,
  vehicleHero: vehicleHeroProp,
  onClose,
}: {
  open: boolean;
  feature: FeatureFlag | null;
  tagUuid: string;
  isOwner?: boolean;
  variant?: PaywallVariant;
  triggerContext?: PaywallTriggerContext;
  /** Live dashboard hero (wins over stale triggerContext image fields). */
  vehicleHero?: PaywallVehicleHeroContext | null;
  onClose: () => void;
}) {
  const { billing, platform } = usePlatformServices();
  const showAnnualPlan = isAnnualPlanAvailable();
  const defaultInterval: ProBillingInterval = showAnnualPlan
    ? "annual"
    : "monthly";
  const [interval, setInterval] = useState<ProBillingInterval>(defaultInterval);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    setInterval(defaultInterval);
    setError(null);
  }, [open, showAnnualPlan, defaultInterval]);

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
    if (!feature) return null;
    const goal = resolvePaywallGoal({
      primaryGoal: readPrimaryGoal(),
      feature,
      context: triggerContext,
    });
    return getPaywallPersonalization({
      goal,
      variant,
      vehicleLabel: triggerContext?.vehicleLabel,
    });
  }, [feature, variant, triggerContext]);

  const vehicleHero = useMemo(
    () =>
      vehicleHeroProp ??
      paywallVehicleHeroFromContext(triggerContext),
    [triggerContext, vehicleHeroProp],
  );

  const aboHref = cloudAboHref(tagUuid);
  const successPath = `/v/${tagUuid}`;

  function handleCheckout() {
    setError(null);
    startTransition(async () => {
      const result = await billing.purchasePlan(
        mapProIntervalToPlanType(interval),
        { successPath, cancelPath: aboHref },
      );
      if (result.status === "error") {
        setError(result.message);
      }
    });
  }

  const sheetMotion = reduceMotion
    ? { initial: false as const, animate: { y: 0 }, exit: { y: 0 } }
    : {
        initial: { y: "100%" },
        animate: { y: 0 },
        exit: { y: "100%" },
        transition: { duration: PAYWALL_SHEET_MS, ease: PAYWALL_EASE },
      };

  if (!feature || !personalization) {
    return null;
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="pro-paywall-layer"
          className="fixed inset-0 z-[110] flex justify-center bg-[color:var(--paywall-modal-scrim)] backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pro-paywall-title"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: PAYWALL_SCRIM_MS, ease: PAYWALL_EASE }}
        >
          <button
            type="button"
            aria-label="Schließen"
            className="absolute inset-0 cursor-default"
            onClick={onClose}
          />

          <motion.div
            {...sheetMotion}
            className={cn(
              PAYWALL_APPLE_CLASS,
              "paywall-sheet relative z-10 flex h-dvh max-h-dvh w-full max-w-lg min-h-0 flex-col overflow-hidden border-0 border-b-0 bg-[color:var(--paywall-sheet-bg)] text-[color:var(--vd-text)] shadow-[var(--vd-shadow-modal)]",
              PAYWALL_SHEET_TOP_RADIUS_CLASS,
            )}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Schließen"
              className="absolute top-[max(0.875rem,env(safe-area-inset-top))] right-4 z-20 inline-flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--paywall-grouped-bg)] text-[color:var(--vd-muted)] transition hover:bg-[color:var(--paywall-grouped-bg-hover)] hover:text-[color:var(--vd-text)]"
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
                  subline={personalization.subline}
                  vehicleEyebrow={personalization.vehicleEyebrow}
                  headlineId="pro-paywall-title"
                  variant={variant}
                  benefits={personalization.benefits}
                  visualKind={personalization.visualKind}
                  visualAriaLabel={personalization.visualAriaLabel}
                  vehicleHero={vehicleHero}
                  ctaSlot={
                    <StickyPaywallCta
                      label={proCheckoutButtonLabel("new", interval)}
                      pending={pending}
                      pendingLabel={proCheckoutPendingLabel(platform.isNativeApp)}
                      error={error}
                      microCopy={proCheckoutMicroCopy(interval)}
                      anchorText={personalization.footnote}
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

