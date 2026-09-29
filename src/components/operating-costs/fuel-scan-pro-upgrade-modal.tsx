"use client";

import { useEffect, useState, useTransition } from "react";
import { Car, FileScan, Sparkles } from "lucide-react";

import { startStripeCheckoutAction } from "@/actions/stripe-checkout";
import { StealthModalShell } from "@/components/billing/stealth-modal-shell";
import { FUEL_SCAN_PAYWALL_COPY } from "@/lib/billing/fuel-scan-paywall-copy";
import { cloudAboHref } from "@/lib/billing/pro-plan";

const BENEFIT_ICONS = {
  "unlimited-scans": FileScan,
  expose: Sparkles,
  "multi-garage": Car,
} as const;

type FuelScanProUpgradeModalProps = {
  open: boolean;
  tagUuid: string;
  onClose: () => void;
  onManualEntry: () => void;
};

export function FuelScanProUpgradeModal({
  open,
  tagUuid,
  onClose,
  onManualEntry,
}: FuelScanProUpgradeModalProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const copy = FUEL_SCAN_PAYWALL_COPY;

  useEffect(() => {
    if (!open) setError(null);
  }, [open]);

  function handleCheckout() {
    setError(null);
    startTransition(async () => {
      const result = await startStripeCheckoutAction({
        successPath: `/v/${tagUuid}/tanken`,
        cancelPath: cloudAboHref(tagUuid),
        interval: "monthly",
      });
      if (result.status === "ok") {
        window.location.assign(result.url);
        return;
      }
      if (result.status === "active") {
        window.location.assign(`/v/${tagUuid}/tanken`);
        return;
      }
      setError(result.message);
    });
  }

  return (
    <StealthModalShell
      open={open}
      titleId="fuel-scan-pro-title"
      onClose={onClose}
    >
      <div className="px-6 pt-8 pb-6">
        <h2
          id="fuel-scan-pro-title"
          className="font-[family-name:var(--font-display)] text-[1.35rem] font-semibold leading-snug tracking-[-0.03em] text-white"
        >
          {copy.headline}
        </h2>
        <p className="mt-3 text-[0.88rem] leading-relaxed text-white/70">
          {copy.subline}
        </p>

        <ul className="mt-6 space-y-3">
          {copy.benefits.map((benefit) => {
            const Icon = BENEFIT_ICONS[benefit.id];
            return (
              <li key={benefit.id} className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/8 text-white/90 ring-1 ring-white/10">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <span className="text-[0.84rem] leading-snug text-white/85">
                  {benefit.label}
                </span>
              </li>
            );
          })}
        </ul>

        <p className="mt-6 text-[0.78rem] font-medium text-white/55">
          {copy.priceLine}
        </p>

        {error ? (
          <p role="alert" className="mt-3 text-[0.8rem] text-red-300">
            {error}
          </p>
        ) : null}

        <button
          type="button"
          disabled={pending}
          onClick={handleCheckout}
          className="mt-5 w-full rounded-2xl bg-white px-4 py-3.5 text-[0.92rem] font-semibold text-neutral-950 transition hover:shadow-[0_0_32px_-6px_rgba(255,255,255,0.55)] disabled:opacity-60"
        >
          {pending ? "Weiterleitung…" : copy.primaryCta}
        </button>

        <button
          type="button"
          onClick={() => {
            onClose();
            onManualEntry();
          }}
          className="mt-4 w-full text-center text-[0.82rem] font-medium text-white/65 underline decoration-white/25 underline-offset-4"
        >
          {copy.secondaryCta}
        </button>
      </div>
    </StealthModalShell>
  );
}
