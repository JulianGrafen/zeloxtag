"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Shield } from "lucide-react";

import { verifyMfaLogin } from "@/lib/auth/mfa-actions";
import { PressableButton } from "@/components/vehicle-dashboard/Pressable";

interface MfaVerifyFormProps {
  nextPath?: string;
}

export function MfaVerifyForm({ nextPath = "/dashboard" }: MfaVerifyFormProps) {
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <section className="mx-auto flex w-full max-w-lg flex-col gap-5 px-4 pb-12 pt-6 sm:px-5">
      <div className="rounded-[1.75rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-6 shadow-[var(--vd-shadow)]">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-900 text-white">
          <Shield className="h-5 w-5" aria-hidden />
        </div>
        <h1 className="mt-4 font-[family-name:var(--font-display)] text-[1.55rem] font-semibold tracking-[-0.035em] text-[color:var(--vd-text)]">
          Zwei-Faktor-Code
        </h1>
        <p className="mt-2 text-[0.92rem] leading-relaxed text-[color:var(--vd-muted)]">
          Gib den 6-stelligen Code aus deiner Authenticator-App ein.
        </p>
      </div>

      <form
        className="space-y-3 rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-4 shadow-[var(--vd-shadow-sm)]"
        onSubmit={(event) => {
          event.preventDefault();
          setMessage(null);
          startTransition(async () => {
            const result = await verifyMfaLogin(code, nextPath || "/dashboard");
            if (result.status === "rate_limited") {
              setMessage(`Zu viele Versuche. Bitte in ${result.retryAfterSec}s warten.`);
              return;
            }
            if (result.status === "verified") {
              window.location.assign(result.redirectTo || "/dashboard");
              return;
            }
            if (result.status === "error") {
              setMessage(result.message);
            }
          });
        }}
      >
        <label className="block space-y-1.5">
          <span className="text-[0.72rem] font-medium uppercase tracking-[0.14em] text-[color:var(--vd-muted)]">
            TOTP-Code
          </span>
          <input
            type="text"
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            required
            autoComplete="one-time-code"
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
            className="w-full rounded-xl border border-[color:var(--vd-border)] bg-white px-3 py-2.5 text-center font-mono text-[1.2rem] tracking-[0.35em] text-[color:var(--vd-text)] outline-none ring-neutral-900 focus:ring-2"
            placeholder="000000"
          />
        </label>

        {message ? (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-[0.8rem] text-red-700">
            {message}
          </p>
        ) : null}

        <PressableButton
          type="submit"
          variant="button"
          disabled={pending || code.length !== 6}
          className="inline-flex w-full items-center justify-center rounded-2xl bg-neutral-900 px-4 py-3.5 text-[0.88rem] font-semibold text-white disabled:opacity-60"
        >
          {pending ? "Prüfen…" : "Bestätigen"}
        </PressableButton>
      </form>

      <Link
        href="/login"
        className="block text-center text-[0.82rem] font-medium text-[color:var(--vd-muted)]"
      >
        Zurück zur Anmeldung
      </Link>
    </section>
  );
}
