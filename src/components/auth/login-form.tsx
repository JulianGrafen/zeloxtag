"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Mail } from "lucide-react";

import { sendMagicLink } from "@/lib/auth/actions";
import { PressableButton } from "@/components/vehicle-dashboard/Pressable";

interface LoginFormProps {
  nextPath?: string;
  initialError?: string;
}

export function LoginForm({ nextPath = "/", initialError }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(initialError ?? null);
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <section className="mx-auto flex w-full max-w-lg flex-col gap-5 px-4 pb-12 pt-6 sm:px-5">
      <div className="rounded-[1.75rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-6 shadow-[var(--vd-shadow)]">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-900 text-white">
          <Mail className="h-5 w-5" aria-hidden />
        </div>
        <p className="mt-4 text-[0.65rem] font-medium uppercase tracking-[0.2em] text-[color:var(--vd-muted)]">
          Auth
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-[1.55rem] font-semibold tracking-[-0.035em] text-[color:var(--vd-text)]">
          Magic Link
        </h1>
        <p className="mt-2 text-[0.92rem] leading-relaxed text-[color:var(--vd-muted)]">
          Wir senden dir einen einmaligen Anmelde-Link per E-Mail. Kein Passwort nötig.
        </p>
      </div>

      {sent ? (
        <div className="rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-4 shadow-[var(--vd-shadow-sm)]">
          <p className="text-[0.9rem] font-semibold text-[color:var(--vd-text)]">
            Link unterwegs
          </p>
          <p className="mt-1 text-[0.82rem] leading-relaxed text-[color:var(--vd-muted)]">
            Prüfe dein Postfach für <span className="font-medium text-[color:var(--vd-text)]">{email}</span>.
          </p>
        </div>
      ) : (
        <form
          className="space-y-3 rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-4 shadow-[var(--vd-shadow-sm)]"
          onSubmit={(event) => {
            event.preventDefault();
            setMessage(null);
            startTransition(async () => {
              const result = await sendMagicLink(email, nextPath);
              if (result.status === "sent") {
                setSent(true);
                return;
              }
              if (result.status === "unconfigured") {
                setMessage(
                  "Supabase ist nicht konfiguriert. Setze NEXT_PUBLIC_SUPABASE_URL und NEXT_PUBLIC_SUPABASE_ANON_KEY.",
                );
                return;
              }
              setMessage(result.message);
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

          <PressableButton
            type="submit"
            variant="button"
            disabled={pending}
            className="inline-flex w-full items-center justify-center rounded-2xl bg-neutral-900 px-4 py-3.5 text-[0.88rem] font-semibold text-white disabled:opacity-60"
          >
            {pending ? "Senden…" : "Link senden"}
          </PressableButton>
        </form>
      )}

      <Link
        href="/"
        className="block text-center text-[0.82rem] font-medium text-[color:var(--vd-muted)]"
      >
        Zur Startseite
      </Link>
    </section>
  );
}
