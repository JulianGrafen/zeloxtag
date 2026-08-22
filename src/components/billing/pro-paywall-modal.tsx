"use client";

import { X } from "lucide-react";

import { StripeCheckoutButton } from "@/components/billing/stripe-checkout-button";
import { cloudAboHref, proCheckoutButtonLabel } from "@/lib/billing/pro-plan";
import {
  paywallBody,
  paywallTitle,
  type FeatureFlag,
} from "@/lib/permissions/feature-access";

export function ProPaywallModal({
  open,
  feature,
  tagUuid,
  isOwner = true,
  onClose,
}: {
  open: boolean;
  feature: FeatureFlag | null;
  tagUuid: string;
  isOwner?: boolean;
  onClose: () => void;
}) {
  if (!open || !feature) return null;

  const aboHref = cloudAboHref(tagUuid);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:items-center"
      style={{ background: "var(--vd-overlay)" }}
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
      <div className="vd-surface-card relative z-10 w-full max-w-md p-5 shadow-[var(--vd-shadow-modal)]">
        <div className="mb-3 flex items-start justify-between gap-3">
          <p className="claim-kicker">ZeloxTag Pro</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[color:var(--vd-muted)] transition hover:bg-black/5"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <h2
          id="pro-paywall-title"
          className="font-[family-name:var(--font-display)] text-[1.2rem] font-semibold tracking-[-0.03em] text-[color:var(--vd-text)]"
        >
          {paywallTitle(feature)}
        </h2>
        <p className="claim-copy mt-2 text-[0.88rem]">
          {isOwner
            ? paywallBody(feature)
            : "Der Fahrzeughalter muss ZeloxTag Pro aktivieren, bevor diese Funktion verfügbar ist."}
        </p>
        {isOwner ? (
          <StripeCheckoutButton
            successPath={`/v/${tagUuid}`}
            cancelPath={aboHref}
            label={proCheckoutButtonLabel("new")}
          />
        ) : null}
        <button
          type="button"
          onClick={onClose}
          className="claim-later mt-2 w-full rounded-xl px-3 py-2.5"
        >
          {isOwner
            ? "Weiter mit der kostenlosen Visitenkarte"
            : "Zurück zum Dashboard"}
        </button>
      </div>
    </div>
  );
}
