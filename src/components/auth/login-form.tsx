"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, ShieldCheck } from "lucide-react";

import { ScanContent } from "@/components/layout/scan-content";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  signInWithPassword,
  signUpWithPassword,
  type AuthActionResult,
} from "@/lib/auth/actions";

type AuthTab = "password" | "signup";

interface LoginFormProps {
  nextPath?: string;
  initialError?: string;
  /** Shown after MFA recovery code disabled 2FA. */
  recovered?: boolean;
  initialTab?: AuthTab;
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

export function LoginForm({
  nextPath = "/auth/continue",
  initialError,
  recovered = false,
  initialTab = "password",
}: LoginFormProps) {
  const router = useRouter();
  const [tab, setTab] = useState<AuthTab>(initialTab);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(initialError ?? null);
  const [info, setInfo] = useState<string | null>(
    recovered
      ? "2FA wurde mit einem Recovery-Code deaktiviert. Melde dich an und richte 2FA unter Einstellungen neu ein."
      : null,
  );
  const [pending, startTransition] = useTransition();

  const tabs: Array<{ id: AuthTab; label: string; icon: typeof KeyRound }> = [
    { id: "password", label: "Anmelden", icon: KeyRound },
    { id: "signup", label: "Registrieren", icon: ShieldCheck },
  ];

  return (
    <ScanContent className="gap-5 pb-12 pt-[max(1.75rem,env(safe-area-inset-top))]">
      <div className="vd-surface-card p-6">
        <div className="vd-icon-badge h-12 w-12">
          <ShieldCheck className="h-5 w-5" aria-hidden />
        </div>
        <h1 className="claim-title mt-4 text-[1.85rem]">ZeloxTag</h1>
        <p className="claim-copy mt-2">
          Melde dich an, um deine digitale Fahrzeugakte zu öffnen.
        </p>
      </div>

      <div className="vd-tile grid grid-cols-2 gap-1 p-1">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setTab(id);
              setMessage(null);
              setInfo(null);
            }}
            className={`inline-flex items-center justify-center gap-1.5 rounded-[var(--vd-radius-control)] px-2 py-2.5 text-[0.72rem] font-semibold transition ${
              tab === id
                ? "bg-neutral-900 text-white shadow-sm"
                : "text-[color:var(--vd-muted)] hover:text-[color:var(--vd-text)]"
            }`}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden />
            {label}
          </button>
        ))}
      </div>

      <form
        className="vd-tile space-y-3 p-4"
        onSubmit={(event) => {
          event.preventDefault();
          setMessage(null);
          setInfo(null);
          startTransition(async () => {
            const destination = nextPath || "/auth/continue";
            if (tab === "signup") {
              const result = await signUpWithPassword(
                email,
                password,
                destination,
              );
              if (result.status === "mfa_required") {
                router.push(
                  `/login/mfa?next=${encodeURIComponent(destination)}`,
                );
                return;
              }
              if (result.status === "ok") {
                window.location.assign(
                  result.redirectTo || destination,
                );
                return;
              }
              setMessage(mapAuthError(result));
              return;
            }

            const result = await signInWithPassword(
              email,
              password,
              destination,
            );
            if (result.status === "mfa_required") {
              router.push(
                `/login/mfa?next=${encodeURIComponent(destination)}`,
              );
              return;
            }
            if (result.status === "ok") {
              window.location.assign(
                result.redirectTo || "/auth/continue",
              );
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
          <Input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="du@beispiel.de"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-[0.72rem] font-medium uppercase tracking-[0.14em] text-[color:var(--vd-muted)]">
            Passwort
          </span>
          <Input
            type="password"
            required
            minLength={10}
            autoComplete={tab === "signup" ? "new-password" : "current-password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Mindestens 10 Zeichen"
          />
        </label>

        {tab === "password" ? (
          <div className="flex justify-end">
            <a
              href="/login/reset"
              className="text-[0.78rem] font-medium text-[color:var(--vd-muted)] underline-offset-2 hover:underline"
            >
              Passwort vergessen?
            </a>
          </div>
        ) : null}

        {message ? <p className="vd-alert-error">{message}</p> : null}
        {info ? <p className="vd-alert-success">{info}</p> : null}

        {tab === "signup" ? (
          <p className="text-[0.75rem] leading-relaxed text-[color:var(--vd-muted)]">
            Mit der Registrierung akzeptierst du unsere{" "}
            <a href="/agb" className="underline-offset-2 hover:underline">
              AGB
            </a>{" "}
            und nimmst unsere{" "}
            <a href="/datenschutz" className="underline-offset-2 hover:underline">
              Datenschutzerklärung
            </a>{" "}
            zur Kenntnis.
          </p>
        ) : null}

        <Button type="submit" disabled={pending}>
          {pending
            ? "Bitte warten…"
            : tab === "signup"
              ? "Konto erstellen"
              : "Anmelden"}
        </Button>
      </form>

      <p className="text-center text-[0.78rem] leading-relaxed text-[color:var(--vd-muted)]">
        Neuer Tag? Scanne den QR-Code am Fahrzeug, um ihn zu beanspruchen.
      </p>

      <p className="text-center text-[0.78rem] text-[color:var(--vd-muted)]">
        <a
          href="/demo"
          className="font-medium text-[color:var(--vd-text)] underline decoration-[color:var(--vd-border)] underline-offset-4 transition hover:decoration-neutral-900"
        >
          Demo ansehen
        </a>
        <span className="text-[color:var(--vd-muted)]">
          {" "}
          · BMW E36 328i Showcase
        </span>
      </p>

      <nav
        aria-label="Rechtliches"
        className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[0.75rem] text-[color:var(--vd-muted)]"
      >
        <a href="/impressum" className="underline-offset-2 hover:underline">
          Impressum
        </a>
        <span aria-hidden>·</span>
        <a href="/agb" className="underline-offset-2 hover:underline">
          AGB
        </a>
        <span aria-hidden>·</span>
        <a href="/datenschutz" className="underline-offset-2 hover:underline">
          Datenschutz
        </a>
      </nav>
    </ScanContent>
  );
}
