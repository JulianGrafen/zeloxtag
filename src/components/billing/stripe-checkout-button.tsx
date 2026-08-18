"use client";

import { useState, useTransition } from "react";

import {
  startStripeCheckoutAction,
  startStripePortalAction,
} from "@/actions/stripe-checkout";
import { Button } from "@/components/ui/button";

export function StripeCheckoutButton({
  successPath,
  cancelPath,
  label = "Cloud Abo abschließen · 4,99 € / Monat",
}: {
  successPath: string;
  cancelPath: string;
  label?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="mt-4 space-y-2.5">
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
        {pending ? "Weiter zu Stripe…" : label}
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
