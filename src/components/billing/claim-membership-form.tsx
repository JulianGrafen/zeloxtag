"use client";

import { useState, useTransition } from "react";

import { claimMembershipAction } from "@/actions/claim-membership";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ClaimMembershipForm({
  defaultShopifyEmail = "",
  successHref,
}: {
  defaultShopifyEmail?: string;
  successHref?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [sent, setSent] = useState(false);

  return (
    <form
      className="mt-4 space-y-2.5"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        setError(null);
        setOk(false);
        setSent(false);
        startTransition(async () => {
          const result = await claimMembershipAction(form);
          if (result.status === "ok") {
            setOk(true);
            if (successHref) {
              window.location.assign(successHref);
            }
            return;
          }
          if (result.status === "sent") {
            setSent(true);
            return;
          }
          setError(result.message);
        });
      }}
    >
      <p className="text-[0.78rem] font-medium text-[color:var(--vd-text)]">
        Shopify-Mail zuordnen
      </p>
      <p className="text-[0.72rem] leading-relaxed text-[color:var(--vd-muted)]">
        Die E-Mail, mit der du im Shop bezahlt hast. Stimmt sie mit dem Login
        überein, verknüpfen wir sofort — sonst geht ein Link an genau diese Mail.
      </p>
      <Input
        name="shopifyEmail"
        type="email"
        required
        autoComplete="email"
        defaultValue={defaultShopifyEmail}
        placeholder="E-Mail aus dem Shopify-Checkout"
        className="h-11"
      />
      <Button type="submit" className="h-11 w-full" disabled={pending}>
        {pending ? "Prüfen…" : "Mitgliedschaft zuordnen"}
      </Button>
      {error ? (
        <p className="text-[0.78rem] text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      {ok ? (
        <p className="text-[0.78rem] text-emerald-800">Mitgliedschaft verknüpft.</p>
      ) : null}
      {sent ? (
        <p className="text-[0.78rem] text-emerald-800">
          Prüfe das Postfach der Shop-Mail und öffne den Freischalt-Link.
        </p>
      ) : null}
    </form>
  );
}
