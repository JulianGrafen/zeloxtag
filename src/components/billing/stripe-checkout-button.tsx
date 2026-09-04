"use client";

import { useState, useTransition } from "react";

import {
  startStripeCheckoutAction,
  startStripePortalAction,
} from "@/actions/stripe-checkout";
import { ProPlanIntervalPicker } from "@/components/billing/pro-plan-interval-picker";
import { Button } from "@/components/ui/button";
import {
  PRO_CHECKOUT_BUTTON_LABEL,
  proCheckoutButtonLabel,
  type ProBillingInterval,
  type ProCheckoutAudience,
} from "@/lib/billing/pro-plan";

export function StripeCheckoutButton({
  successPath,
  cancelPath,
  label,
  audience = "new",
  showAnnualPlan = true,
  defaultInterval = "monthly",
}: {
  successPath: string;
  cancelPath: string;
  label?: string;
  audience?: ProCheckoutAudience;
  showAnnualPlan?: boolean;
  defaultInterval?: ProBillingInterval;
}) {
  const [interval, setInterval] = useState<ProBillingInterval>(defaultInterval);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const resolvedLabel =
    label ?? proCheckoutButtonLabel(audience, interval);

  return (
    <div className="space-y-3">
      <ProPlanIntervalPicker
        value={interval}
        onChange={setInterval}
        showAnnual={showAnnualPlan}
      />
      <Button
        type="button"
        className="h-11 w-full"
        disabled={pending}
        onClick={() => {
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
        }}
      >
        {pending ? "Weiter zu Stripe…" : resolvedLabel}
      </Button>
      {error ? (
        <p className="text-[0.78rem] text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function StripePortalButton({
  returnPath = "/settings",
}: {
  returnPath?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="mt-4 space-y-2.5">
      <Button
        type="button"
        variant="outline"
        className="h-11 w-full"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await startStripePortalAction({ returnPath });
            if (result.status === "ok") {
              window.location.assign(result.url);
              return;
            }
            setError(result.message);
          });
        }}
      >
        {pending ? "Öffnen…" : "Abo in Stripe verwalten"}
      </Button>
      {error ? (
        <p className="text-[0.78rem] text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
