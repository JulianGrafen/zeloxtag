"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { KeyRound } from "lucide-react";

import { requestPasswordReset } from "@/lib/auth/actions";
import { PressableButton } from "@/components/vehicle-dashboard/Pressable";

type PasswordResetRequestFormProps = {
  initialError?: string | null;
};

export function PasswordResetRequestForm({
  initialError = null,
}: PasswordResetRequestFormProps) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(initialError);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <section className="mx-auto flex w-full max-w-lg flex-col gap-5 px-4 pb-12 pt-[max(1.75rem,env(safe-area-inset-top))] sm:px-5">
      <div className="rounded-[1.75rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-6 shadow-[var(--vd-shadow)]">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-900 text-white">
          <KeyRound className="h-5 w-5" aria-hidden />
        </div>
        <h1 className="mt-4 font-[family-name:var(--font-display)] text-[1.55rem] font-semibold tracking-[-0.035em] text-[color:var(--vd-text)]">
          Passwort zurücksetzen
        </h1>
        <p className="mt-2 text-[0.92rem] leading-relaxed text-[color:var(--vd-muted)]">
          Gib deine E-Mail ein. Wenn ein Konto existiert, senden wir dir einen
          Link zum Festlegen eines neuen Passworts.
        </p>
      </div>

      <form
        className="space-y-3 rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-4 shadow-[var(--vd-shadow-sm)]"
        onSubmit={(event) => {
          event.preventDefault();
          setMessage(null);
          setInfo(null);
          startTransition(async () => {
            const result = await requestPasswordReset(email);
            if (result.status === "rate_limited") {
              setMessage(
                `Zu viele Versuche. Bitte in ${result.retryAfterSec}s warten.`,
              );
              return;
            }
            if (result.status === "ok") {
              setInfo(
                result.message ??
                  "Wenn ein Konto existiert, erhältst du gleich eine E-Mail.",
              );
              return;
            }
            if (result.status === "unconfigured") {
              setMessage("Supabase ist nicht konfiguriert.");
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
            E-Mail
          </span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-xl border border-[color:var(--vd-border)] bg-white px-3 py-2.5 text-[0.9rem] text-[color:var(--vd-text)] outline-none ring-neutral-900 focus:ring-2"
            placeholder="du@beispiel.de"
          />
        </label>

        {message ? (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-[0.8rem] text-red-700">
            {message}
          </p>
        ) : null}
        {info ? (
          <p className="rounded-xl bg-emerald-50 px-3 py-2 text-[0.8rem] text-emerald-800">
            {info}
          </p>
        ) : null}

        <PressableButton
          type="submit"
          variant="button"
          disabled={pending || Boolean(info)}
          className="inline-flex w-full items-center justify-center rounded-2xl bg-neutral-900 px-4 py-3.5 text-[0.88rem] font-semibold text-white disabled:opacity-60"
        >
          {pending ? "Senden…" : "Reset-Link senden"}
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
