"use client";

import { useState, useTransition } from "react";
import { Shield } from "lucide-react";

import {
  verifyMfaLogin,
  verifyMfaRecoveryCode,
} from "@/lib/auth/mfa-actions";
import { signOutToLoginForm } from "@/lib/auth/actions";
import { PressableButton } from "@/components/vehicle-dashboard/Pressable";

interface MfaVerifyFormProps {
  nextPath?: string;
}

export function MfaVerifyForm({ nextPath = "/dashboard" }: MfaVerifyFormProps) {
  const [mode, setMode] = useState<"totp" | "recovery">("totp");
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
          {mode === "totp" ? "Zwei-Faktor-Code" : "Recovery-Code"}
        </h1>
        <p className="mt-2 text-[0.92rem] leading-relaxed text-[color:var(--vd-muted)]">
          {mode === "totp"
            ? "Gib den 6-stelligen Code aus deiner Authenticator-App ein."
            : "Kein Zugriff auf die App? Nutze einen einmaligen Recovery-Code. Danach wird 2FA deaktiviert und du meldest dich erneut an."}
        </p>
      </div>

      <form
        className="space-y-3 rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-4 shadow-[var(--vd-shadow-sm)]"
        onSubmit={(event) => {
          event.preventDefault();
          setMessage(null);
          startTransition(async () => {
            if (mode === "recovery") {
              const result = await verifyMfaRecoveryCode(code);
              if (result.status === "rate_limited") {
                setMessage(
                  `Zu viele Versuche. Bitte in ${result.retryAfterSec}s warten.`,
                );
                return;
              }
              if (result.status === "recovered") {
                window.location.assign(result.redirectTo);
                return;
              }
              if (result.status === "error") {
                setMessage(result.message);
              }
              return;
            }

            const result = await verifyMfaLogin(
              code,
              nextPath || "/auth/continue",
            );
            if (result.status === "rate_limited") {
              setMessage(`Zu viele Versuche. Bitte in ${result.retryAfterSec}s warten.`);
              return;
            }
            if (result.status === "verified") {
              window.location.assign("/auth/continue");
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
            {mode === "totp" ? "TOTP-Code" : "Recovery-Code"}
          </span>
          {mode === "totp" ? (
            <input
              type="text"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              required
              autoComplete="one-time-code"
              value={code}
              onChange={(event) =>
                setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
              }
              className="w-full rounded-xl border border-[color:var(--vd-border)] bg-white px-3 py-2.5 text-center font-mono text-[1.2rem] tracking-[0.35em] text-[color:var(--vd-text)] outline-none ring-neutral-900 focus:ring-2"
              placeholder="000000"
            />
          ) : (
            <input
              type="text"
              autoComplete="off"
              required
              value={code}
              onChange={(event) =>
                setCode(
                  event.target.value
                    .toUpperCase()
                    .replace(/[^A-Z0-9\-]/g, "")
                    .slice(0, 12),
                )
              }
              className="w-full rounded-xl border border-[color:var(--vd-border)] bg-white px-3 py-2.5 text-center font-mono text-[1.05rem] tracking-[0.18em] text-[color:var(--vd-text)] outline-none ring-neutral-900 focus:ring-2"
              placeholder="XXXX-XXXX"
            />
          )}
        </label>

        {message ? (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-[0.8rem] text-red-700">
            {message}
          </p>
        ) : null}

        <PressableButton
          type="submit"
          variant="button"
          disabled={
            pending ||
            (mode === "totp" ? code.length !== 6 : code.replace(/-/g, "").length < 8)
          }
          className="inline-flex w-full items-center justify-center rounded-2xl bg-neutral-900 px-4 py-3.5 text-[0.88rem] font-semibold text-white disabled:opacity-60"
        >
          {pending ? "Prüfen…" : "Bestätigen"}
        </PressableButton>

        <button
          type="button"
          className="w-full text-center text-[0.82rem] font-medium text-[color:var(--vd-muted)] underline-offset-2 hover:underline"
          onClick={() => {
            setMode((current) => (current === "totp" ? "recovery" : "totp"));
            setCode("");
            setMessage(null);
          }}
        >
          {mode === "totp"
            ? "Authenticator verloren? Recovery-Code nutzen"
            : "Zurück zum Authenticator-Code"}
        </button>
      </form>

      <form action={signOutToLoginForm}>
        <input type="hidden" name="next" value="/auth/continue" />
        <button
          type="submit"
          className="block w-full text-center text-[0.82rem] font-medium text-[color:var(--vd-muted)] underline-offset-2 hover:underline"
        >
          Zurück zur Anmeldung
        </button>
      </form>
    </section>
  );
}
