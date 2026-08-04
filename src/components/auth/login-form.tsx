"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, ShieldCheck } from "lucide-react";

import { signInWithPassword, type AuthActionResult } from "@/lib/auth/actions";
import { signUpWithPasswordBrowser } from "@/lib/auth/browser-auth";
import { PressableButton } from "@/components/vehicle-dashboard/Pressable";

type AuthTab = "password" | "signup";

interface LoginFormProps {
  nextPath?: string;
  initialError?: string;
}

function mapAuthError(result: AuthActionResult): string | null {
  if (result.status === "error") return result.message;
  if (result.status === "unconfigured") {
    return "Supabase ist nicht konfiguriert. Setze NEXT_PUBLIC_SUPABASE_URL und NEXT_PUBLIC_SUPABASE_ANON_KEY.";
  }
  if (result.status === "rate_limited") {
    return `Zu viele Versuche. Bitte in ${result.retryAfterSec}s erneut versuchen.`;
  }
  if (result.status === "ok" && result.message) return result.message;
  return null;
}

export function LoginForm({ nextPath = "/dashboard", initialError }: LoginFormProps) {
  const router = useRouter();
  const [tab, setTab] = useState<AuthTab>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(initialError ?? null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const tabs: Array<{ id: AuthTab; label: string; icon: typeof KeyRound }> = [
    { id: "password", label: "Anmelden", icon: KeyRound },
    { id: "signup", label: "Registrieren", icon: ShieldCheck },
  ];

  return (
    <section className="mx-auto flex w-full max-w-lg flex-col gap-5 px-4 pb-12 pt-[max(1.75rem,env(safe-area-inset-top))] sm:px-5">
      <div className="rounded-[1.75rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-6 shadow-[var(--vd-shadow)]">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-900 text-white">
          <ShieldCheck className="h-5 w-5" aria-hidden />
        </div>
        <h1 className="mt-4 font-[family-name:var(--font-display)] text-[1.85rem] font-semibold tracking-[-0.04em] text-[color:var(--vd-text)]">
          ZeloxTag
        </h1>
        <p className="mt-2 text-[0.95rem] leading-relaxed text-[color:var(--vd-muted)]">
          Melde dich an, um deine digitale Fahrzeugakte zu öffnen.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-1 rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-1 shadow-[var(--vd-shadow-sm)]">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setTab(id);
              setMessage(null);
              setInfo(null);
            }}
            className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-[0.72rem] font-semibold transition ${
              tab === id
                ? "bg-neutral-900 text-white"
                : "text-[color:var(--vd-muted)] hover:text-[color:var(--vd-text)]"
            }`}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden />
            {label}
          </button>
        ))}
      </div>

      <form
        className="space-y-3 rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-4 shadow-[var(--vd-shadow-sm)]"
        onSubmit={(event) => {
          event.preventDefault();
          setMessage(null);
          setInfo(null);
          startTransition(async () => {
            if (tab === "signup") {
              const result = await signUpWithPasswordBrowser(
                email,
                password,
                nextPath,
              );
              if (result.status === "confirm_email") {
                setInfo(
                  "Konto erstellt. Bitte bestätige deine E-Mail — öffne den Link in diesem Browser.",
                );
                return;
              }
              if (result.status === "signed_in") {
                window.location.assign(nextPath || "/dashboard");
                return;
              }
              if (result.status === "error") {
                setMessage(result.message);
              }
              return;
            }

            const result = await signInWithPassword(
              email,
              password,
              nextPath || "/dashboard",
            );
            if (result.status === "mfa_required") {
              router.push(
                `/login/mfa?next=${encodeURIComponent("/dashboard")}`,
              );
              return;
            }
            if (result.status === "ok") {
              // Hard nav → vehicle tile dashboard when a tag exists.
              window.location.assign(result.redirectTo || "/dashboard");
              return;
            }
            setMessage(mapAuthError(result));
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

        <label className="block space-y-1.5">
          <span className="text-[0.72rem] font-medium uppercase tracking-[0.14em] text-[color:var(--vd-muted)]">
            Passwort
          </span>
          <input
            type="password"
            required
            minLength={10}
            autoComplete={tab === "signup" ? "new-password" : "current-password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-xl border border-[color:var(--vd-border)] bg-white px-3 py-2.5 text-[0.9rem] text-[color:var(--vd-text)] outline-none ring-neutral-900 focus:ring-2"
            placeholder="Mindestens 10 Zeichen"
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
          disabled={pending}
          className="inline-flex w-full items-center justify-center rounded-2xl bg-neutral-900 px-4 py-3.5 text-[0.88rem] font-semibold text-white disabled:opacity-60"
        >
          {pending
            ? "Bitte warten…"
            : tab === "signup"
              ? "Konto erstellen"
              : "Anmelden"}
        </PressableButton>
      </form>

      <p className="text-center text-[0.78rem] leading-relaxed text-[color:var(--vd-muted)]">
        Neuer Tag? Scanne den QR-Code am Fahrzeug, um ihn zu beanspruchen.
      </p>
    </section>
  );
}
