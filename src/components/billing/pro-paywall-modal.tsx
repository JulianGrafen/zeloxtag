"use client";

import { useEffect, useState, useTransition } from "react";
import { Check, Mail, Shield, X } from "lucide-react";

import { startStripeCheckoutAction } from "@/actions/stripe-checkout";
import { Button } from "@/components/ui/button";
import { isAnnualPlanAvailable } from "@/lib/billing/constants";
import {
  PRO_ANNUAL_RECOMMENDED_LABEL,
  PRO_PAYWALL_FREE_SCAN_EXHAUSTED_KICKER,
  PRO_PAYWALL_MODAL_BENEFITS,
  PRO_PAYWALL_MODAL_SUBLINE,
  PRO_PAYWALL_PROGRESS_LABEL,
  PRO_PAYWALL_PROGRESS_PERCENT,
  PRO_PAYWALL_STICKY_MICROCOPY,
  PRO_PAYWALL_TRIAL_TIMELINE,
  PRO_PLAN_ANNUAL_PRICE,
  PRO_PLAN_CHECKOUT_HEADLINE,
  PRO_PLAN_MONTHLY_PRICE,
  PRO_PLAN_NAME,
  PRO_ANNUAL_CARD_HIGHLIGHT,
  PRO_MONTHLY_CARD_SUBLINE,
  PRO_TRIAL_LABEL,
  cloudAboHref,
  type ProBillingInterval,
  type ProPaywallTimelineIcon,
} from "@/lib/billing/pro-plan";
import {
  type FeatureFlag,
  type PaywallVariant,
} from "@/lib/permissions/feature-access";
import { cn } from "@/lib/utils";

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
  const defaultInterval: ProBillingInterval = showAnnualPlan ? "annual" : "monthly";
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
      className="fixed inset-0 z-[80] flex flex-col bg-black/45 backdrop-blur-sm"
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

      <button
        type="button"
        onClick={onClose}
        aria-label="Schließen"
        className="absolute top-[max(0.75rem,env(safe-area-inset-top))] right-4 z-20 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-neutral-700 shadow-sm transition hover:bg-white"
      >
        <X className="h-5 w-5" aria-hidden />
      </button>

      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        <div
          className={cn(
            "flex-1 overflow-y-auto overscroll-contain px-4 pt-14",
            isOwner ? "pb-44" : "pb-8",
          )}
        >
          <div className="mx-auto w-full max-w-lg">
            <p className="claim-kicker">{PRO_PLAN_NAME}</p>

            {isOwner && variant === "free_scan_exhausted" ? (
              <p className="mt-3 inline-flex rounded-full bg-amber-50 px-3 py-1 text-[0.72rem] font-semibold tracking-[0.06em] text-amber-900 uppercase">
                {PRO_PAYWALL_FREE_SCAN_EXHAUSTED_KICKER}
              </p>
            ) : null}

            {isOwner ? (
              <>
                <PaywallProgress
                  percent={PRO_PAYWALL_PROGRESS_PERCENT}
                  label={PRO_PAYWALL_PROGRESS_LABEL}
                />

                <h2
                  id="pro-paywall-title"
                  className="font-[family-name:var(--font-display)] text-[1.35rem] font-semibold tracking-[-0.03em] text-[color:var(--vd-text)] sm:text-[1.5rem]"
                >
                  {PRO_PLAN_CHECKOUT_HEADLINE}
                </h2>
                <p className="claim-copy mt-2 text-[0.88rem] leading-relaxed">
                  {PRO_PAYWALL_MODAL_SUBLINE}
                </p>

                <BenefitList items={PRO_PAYWALL_MODAL_BENEFITS} />
                <TrialTimeline nodes={PRO_PAYWALL_TRIAL_TIMELINE} />

                <div
                  className={cn(
                    "mt-6 grid gap-3",
                    showAnnualPlan ? "sm:grid-cols-2" : "grid-cols-1",
                  )}
                  role="radiogroup"
                  aria-label="Abrechnungsintervall"
                >
                  <PricingCard
                    interval="monthly"
                    selected={interval === "monthly"}
                    onSelect={() => setInterval("monthly")}
                    price={`${PRO_PLAN_MONTHLY_PRICE} / Monat`}
                    subline={PRO_MONTHLY_CARD_SUBLINE}
                  />
                  {showAnnualPlan ? (
                    <PricingCard
                      interval="annual"
                      selected={interval === "annual"}
                      onSelect={() => setInterval("annual")}
                      price={`${PRO_PLAN_ANNUAL_PRICE} / Jahr`}
                      subline={PRO_ANNUAL_CARD_HIGHLIGHT}
                      badge={PRO_ANNUAL_RECOMMENDED_LABEL}
                      highlighted
                    />
                  ) : null}
                </div>
              </>
            ) : (
              <>
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
              </>
            )}
          </div>
        </div>

        {isOwner ? (
          <StickyPaywallCta
            label={PRO_TRIAL_LABEL}
            microCopy={PRO_PAYWALL_STICKY_MICROCOPY}
            pending={pending}
            error={error}
            dismissLabel="Weiter mit der kostenlosen Visitenkarte"
            onCheckout={handleCheckout}
            onDismiss={onClose}
          />
        ) : null}
      </div>
    </div>
  );
}

function PaywallProgress({
  percent,
  label,
}: {
  percent: number;
  label: string;
}) {
  return (
    <div className="mt-4 mb-5">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-[0.78rem] font-medium text-[color:var(--vd-text)]">
          {label}
        </span>
        <span className="text-[0.78rem] font-semibold tabular-nums text-[color:var(--vd-muted)]">
          {percent} %
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label={label}
        className="h-2 overflow-hidden rounded-full bg-black/8"
      >
        <div
          className="h-full rounded-full bg-[#0a0a0a] transition-[width] duration-350 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function BenefitList({ items }: { items: readonly string[] }) {
  return (
    <ul
      className="mt-5 space-y-3"
      aria-label="Vorteile von ZeloxTag Pro"
    >
      {items.map((benefit) => (
        <li
          key={benefit}
          className="flex gap-2.5 text-[0.84rem] leading-snug text-[color:var(--vd-text)]"
        >
          <span
            className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white"
            aria-hidden
          >
            <Check className="h-3 w-3" strokeWidth={3} />
          </span>
          <span>{benefit}</span>
        </li>
      ))}
    </ul>
  );
}

function TrialTimeline({
  nodes,
}: {
  nodes: readonly { icon: ProPaywallTimelineIcon; text: string }[];
}) {
  return (
    <div className="mt-6" aria-label="Testphase-Ablauf">
      <ol className="relative space-y-0">
        {nodes.map((node, index) => (
          <li key={node.text} className="relative flex gap-3 pb-5 last:pb-0">
            {index < nodes.length - 1 ? (
              <span
                className="absolute top-7 left-[0.6875rem] h-[calc(100%-1.25rem)] w-px bg-[color:var(--vd-border)]"
                aria-hidden
              />
            ) : null}
            <span
              className="relative z-10 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] text-[color:var(--vd-text)]"
              aria-hidden
            >
              <TimelineIcon icon={node.icon} />
            </span>
            <span className="pt-0.5 text-[0.82rem] leading-snug text-[color:var(--vd-text)]">
              {node.text}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function TimelineIcon({ icon }: { icon: ProPaywallTimelineIcon }) {
  switch (icon) {
    case "check":
      return <Check className="h-3.5 w-3.5" strokeWidth={2.5} />;
    case "mail":
      return <Mail className="h-3.5 w-3.5" strokeWidth={2.5} />;
    case "shield":
      return <Shield className="h-3.5 w-3.5" strokeWidth={2.5} />;
  }
}

function PricingCard({
  interval,
  selected,
  onSelect,
  price,
  subline,
  badge,
  highlighted = false,
}: {
  interval: ProBillingInterval;
  selected: boolean;
  onSelect: () => void;
  price: string;
  subline: string;
  badge?: string;
  highlighted?: boolean;
}) {
  const title = interval === "annual" ? "Jährlich" : "Monatlich";

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "relative rounded-2xl border px-4 py-3.5 text-left transition-colors",
        selected && highlighted
          ? "border-blue-600 bg-blue-50/60 ring-2 ring-blue-600"
          : selected
            ? "border-neutral-900 bg-neutral-900 text-white shadow-[var(--vd-shadow-sm)]"
            : "border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)] text-[color:var(--vd-text)] hover:border-neutral-400",
      )}
    >
      {badge ? (
        <span
          className={cn(
            "mb-2 inline-flex rounded-full px-2 py-0.5 text-[0.62rem] font-semibold uppercase tracking-[0.08em]",
            selected && highlighted
              ? "bg-blue-600 text-white"
              : selected
                ? "bg-white/15 text-white"
                : "bg-neutral-900 text-white",
          )}
        >
          {badge}
        </span>
      ) : (
        <span className="mb-2 block min-h-[1.375rem]" aria-hidden />
      )}
      <span
        className={cn(
          "block text-[0.72rem] font-semibold uppercase tracking-[0.12em]",
          selected && !highlighted ? "opacity-80" : "text-[color:var(--vd-muted)]",
          selected && highlighted && "text-blue-800/80",
        )}
      >
        {title}
      </span>
      <span className="mt-1 block text-[0.98rem] font-semibold tracking-[-0.02em]">
        {price}
      </span>
      <span
        className={cn(
          "mt-1 block text-[0.74rem] leading-snug",
          selected && highlighted
            ? "text-blue-900/75"
            : selected && !highlighted
              ? "text-white/75"
              : "text-[color:var(--vd-muted)]",
        )}
      >
        {subline}
      </span>
    </button>
  );
}

function StickyPaywallCta({
  label,
  microCopy,
  pending,
  error,
  dismissLabel,
  onCheckout,
  onDismiss,
}: {
  label: string;
  microCopy: string;
  pending: boolean;
  error: string | null;
  dismissLabel: string;
  onCheckout: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-[color:var(--vd-border)] bg-[color:var(--vd-surface)]/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(0,0,0,0.08)] backdrop-blur-md">
      <div className="mx-auto w-full max-w-lg">
        <Button
          type="button"
          className="h-12 w-full text-[0.95rem] font-semibold"
          disabled={pending}
          onClick={onCheckout}
        >
          {pending ? "Weiter zu Stripe…" : label}
        </Button>
        <p className="mt-2 text-center text-[0.72rem] leading-relaxed text-[color:var(--vd-muted)]">
          {microCopy}
        </p>
        {error ? (
          <p className="mt-2 text-center text-[0.74rem] text-red-700" role="alert">
            {error}
          </p>
        ) : null}
        <button
          type="button"
          onClick={onDismiss}
          className="claim-later mt-2 w-full rounded-xl px-3 py-2 text-[0.84rem]"
        >
          {dismissLabel}
        </button>
      </div>
    </div>
  );
}
