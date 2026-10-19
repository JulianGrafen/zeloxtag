"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  OAuthDivider,
  OAuthProviderButtons,
} from "@/components/auth/oauth-provider-buttons";
import { AuthLegalConsentNotice } from "@/components/legal/auth-legal-consent-notice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  signInWithPassword,
  signUpWithPassword,
  type AuthActionResult,
} from "@/lib/auth/actions";
import { cn } from "@/lib/utils";

const SIGNUP_NEXT = "/onboarding/fahrzeug";

const GATE_INPUT_CLASS =
  "min-h-11 w-full border-white/20 bg-white/10 text-white placeholder:text-white/45";

function mapAuthError(result: AuthActionResult): string | null {
  if (result.status === "error") return result.message;
  if (result.status === "unconfigured") {
    return "Anmeldung ist derzeit nicht verfügbar.";
  }
  if (result.status === "rate_limited") {
    return `Zu viele Versuche. Bitte in ${result.retryAfterSec}s erneut versuchen.`;
  }
  return null;
}

type PublicSwipeConversionGateProps = {
  open: boolean;
  onClose?: () => void;
};

export function PublicSwipeConversionGate({
  open,
  onClose,
}: PublicSwipeConversionGateProps) {
  const router = useRouter();
  const [emailMode, setEmailMode] = useState<"signup" | "signin">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!open) return null;

  const isSignup = emailMode === "signup";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="public-swipe-gate-title"
    >
      <div
        className="absolute inset-0 bg-black/45 backdrop-blur-md"
        aria-hidden
        onClick={onClose}
      />
      <div
        className={cn(
          "relative z-10 w-full max-w-md rounded-2xl border border-white/15",
          "bg-black/60 p-6 shadow-2xl backdrop-blur-xl backdrop-saturate-150",
        )}
      >
        <h2
          id="public-swipe-gate-title"
          className="text-balance font-[family-name:var(--font-display)] text-xl font-bold tracking-[-0.02em] text-white"
        >
          Du hast Geschmack. Aber was steht in deiner Garage?
        </h2>
        <ul className="mt-4 space-y-2 text-[0.9rem] leading-snug text-white/88">
          <li>Auto hochladen &amp; bewerten lassen</li>
          <li>Alle Spec-Sheets sehen</li>
          <li>Unbegrenzt swipen</li>
        </ul>

        <div className="mt-6 space-y-3">
          <OAuthProviderButtons
            nextPath={SIGNUP_NEXT}
            providers={["google"] as const}
            disabled={pending}
          />

          <OAuthDivider className="py-0.5 text-white/55 [&_span]:border-white/15" />

          {isSignup ? (
            <AuthLegalConsentNotice
              variant="signup"
              className="text-white/65 [&_a]:text-white/90"
            />
          ) : null}

          <form
            className="flex flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              setMessage(null);
              setInfo(null);
              startTransition(async () => {
                if (isSignup) {
                  const result = await signUpWithPassword(
                    email,
                    password,
                    SIGNUP_NEXT,
                  );
                  if (result.status === "mfa_required") {
                    router.push(
                      `/login/mfa?next=${encodeURIComponent(SIGNUP_NEXT)}`,
                    );
                    return;
                  }
                  if (result.status === "confirm_email") {
                    setInfo(result.message);
                    return;
                  }
                  if (result.status === "ok") {
                    window.location.assign(result.redirectTo ?? SIGNUP_NEXT);
                    return;
                  }
                  setMessage(mapAuthError(result));
                  return;
                }

                const result = await signInWithPassword(
                  email,
                  password,
                  SIGNUP_NEXT,
                );
                if (result.status === "mfa_required") {
                  router.push(
                    `/login/mfa?next=${encodeURIComponent(SIGNUP_NEXT)}`,
                  );
                  return;
                }
                if (result.status === "ok") {
                  window.location.assign(result.redirectTo ?? SIGNUP_NEXT);
                  return;
                }
                setMessage(mapAuthError(result));
              });
            }}
          >
            <div className="grid gap-2">
              <Label htmlFor="swipe-gate-email" className="text-white/90">
                E-Mail
              </Label>
              <Input
                id="swipe-gate-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="du@beispiel.de"
                className={GATE_INPUT_CLASS}
                disabled={pending}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="swipe-gate-password" className="text-white/90">
                Passwort
              </Label>
              <Input
                id="swipe-gate-password"
                type="password"
                required
                minLength={10}
                autoComplete={isSignup ? "new-password" : "current-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={isSignup ? "Min. 10 Zeichen" : "Passwort"}
                className={GATE_INPUT_CLASS}
                disabled={pending}
              />
            </div>

            {message ? (
              <p
                role="alert"
                className="rounded-lg border border-rose-400/40 bg-rose-500/15 px-3 py-2 text-sm text-rose-100"
              >
                {message}
              </p>
            ) : null}
            {info ? (
              <p
                role="status"
                className="rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm text-white/88"
              >
                {info}
              </p>
            ) : null}

            <Button
              type="submit"
              disabled={pending}
              className="min-h-11 w-full rounded-full bg-white font-semibold text-black hover:bg-white/90"
            >
              {pending
                ? "Bitte warten…"
                : isSignup
                  ? "Mit E-Mail registrieren"
                  : "Mit E-Mail anmelden"}
            </Button>
          </form>

          <button
            type="button"
            className="w-full text-center text-[0.82rem] text-white/70 underline-offset-4 hover:text-white hover:underline"
            onClick={() => {
              setEmailMode(isSignup ? "signin" : "signup");
              setMessage(null);
              setInfo(null);
            }}
          >
            {isSignup
              ? "Schon ein Konto? Anmelden"
              : "Neu hier? Kostenlos registrieren"}
          </button>
        </div>

        {onClose ? (
          <Button
            type="button"
            variant="ghost"
            className="mt-3 w-full text-white/70 hover:bg-white/10 hover:text-white"
            onClick={onClose}
          >
            Später
          </Button>
        ) : null}
      </div>
    </div>
  );
}
