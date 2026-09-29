"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { ZeloxBrandFadeBanner } from "@/components/brand/zelox-brand-fade-banner";
import { ScanContent } from "@/components/layout/scan-content";
import { AuthLegalConsentNotice } from "@/components/legal/auth-legal-consent-notice";
import { LegalFooterNav } from "@/components/legal/legal-footer-nav";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  signInWithPassword,
  signUpWithPassword,
  type AuthActionResult,
} from "@/lib/auth/actions";
import { DIGITAL_GARAGE_POST_SIGNUP_HINT } from "@/lib/onboarding/digital-garage-register-copy";
import { cn } from "@/lib/utils";

type AuthTab = "password" | "signup";

interface LoginFormProps {
  nextPath?: string;
  initialError?: string;
  /** Shown after MFA recovery code disabled 2FA. */
  recovered?: boolean;
  initialTab?: AuthTab;
  /** Digital-garage register page — signup-focused copy & hints. */
  mode?: "default" | "digitalGarage";
  /** Hide tab switcher (e.g. dedicated /register). */
  lockTab?: AuthTab;
}

const AUTH_FIELD_CLASS = "min-h-11 w-full";
const AUTH_PRIMARY_BUTTON_CLASS = "min-h-11 w-full";

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

function AuthField({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="grid w-full gap-2">
      <Label htmlFor={id} className="text-sm font-medium">
        {label}
      </Label>
      {children}
    </div>
  );
}

export function LoginForm({
  nextPath = "/auth/continue",
  initialError,
  recovered = false,
  initialTab = "password",
  mode = "default",
  lockTab,
}: LoginFormProps) {
  const router = useRouter();
  const [tab, setTab] = useState<AuthTab>(lockTab ?? initialTab);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(initialError ?? null);
  const [info, setInfo] = useState<string | null>(
    recovered
      ? "2FA wurde deaktiviert. Nach dem Login kannst du sie in den Einstellungen neu einrichten."
      : null,
  );
  const [pending, startTransition] = useTransition();

  const isSignup = tab === "signup";
  const isDigitalGarage = mode === "digitalGarage";
  const showTabSwitcher = !lockTab;

  const shell = (
    <>
      {!isDigitalGarage ? (
        <div className="zelox-brand-banner-bleed zelox-brand-banner-bleed--soft -mt-[max(1.25rem,env(safe-area-inset-top))]">
          <ZeloxBrandFadeBanner />
        </div>
      ) : null}

      <Card
        className={cn(
          "relative z-10 overflow-hidden",
          isDigitalGarage
            ? "w-full border-[color:var(--vd-border)] bg-[color:var(--vd-surface)]"
            : "mx-4 mt-0 w-[calc(100%-2rem)] sm:mx-auto sm:w-full",
        )}
      >
        <CardHeader className="sr-only">
          <CardTitle>Anmelden bei ZeloxTag</CardTitle>
        </CardHeader>

        <CardContent className={isDigitalGarage ? "pt-5" : "pt-6"}>
          {showTabSwitcher ? (
            <div
              className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1"
              role="tablist"
              aria-label="Anmeldung oder Registrierung"
            >
              {(
                [
                  { id: "password" as const, label: "Anmelden" },
                  { id: "signup" as const, label: "Registrieren" },
                ] as const
              ).map(({ id, label }) => {
                const selected = tab === id;
                return (
                  <Button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    variant={selected ? "default" : "ghost"}
                    size="sm"
                    className={cn(
                      "min-h-10 w-full justify-center rounded-lg px-3",
                      !selected && "bg-transparent hover:bg-background/70",
                    )}
                    onClick={() => {
                      setTab(id);
                      setMessage(null);
                      setInfo(null);
                    }}
                  >
                    {label}
                  </Button>
                );
              })}
            </div>
          ) : (
            <p className="text-[0.72rem] font-medium tracking-[0.14em] text-[color:var(--vd-muted)] uppercase">
              Konto erstellen
            </p>
          )}

          <form
            className="mt-4 flex w-full flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              setMessage(null);
              setInfo(null);
              startTransition(async () => {
                const destination = nextPath || "/auth/continue";
                if (isSignup) {
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
                  if (result.status === "confirm_email") {
                    setInfo(result.message);
                    return;
                  }
                  if (result.status === "ok") {
                    window.location.assign(result.redirectTo || destination);
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
                  window.location.assign(result.redirectTo || "/auth/continue");
                  return;
                }
                setMessage(mapAuthError(result));
              });
            }}
          >
            <div className="grid w-full gap-4">
              <AuthField id="login-email" label="E-Mail">
                <Input
                  id="login-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="du@beispiel.de"
                  className={AUTH_FIELD_CLASS}
                />
              </AuthField>

              <AuthField id="login-password" label="Passwort">
                <Input
                  id="login-password"
                  type="password"
                  required
                  minLength={10}
                  autoComplete={isSignup ? "new-password" : "current-password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={isSignup ? "Min. 10 Zeichen" : "Passwort"}
                  className={AUTH_FIELD_CLASS}
                />
              </AuthField>
            </div>

            {!isSignup ? (
              <div className="flex w-full justify-end">
                <a
                  href="/login/reset"
                  className="text-sm text-muted-foreground underline-offset-4 hover:underline"
                >
                  Passwort vergessen?
                </a>
              </div>
            ) : null}

            {message ? (
              <p
                role="alert"
                className="w-full rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {message}
              </p>
            ) : null}
            {info ? (
              <p className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
                {info}
              </p>
            ) : null}

            {isSignup ? <AuthLegalConsentNotice variant="signup" /> : null}

            {isSignup && isDigitalGarage ? (
              <p className="text-[0.78rem] leading-relaxed text-[color:var(--vd-muted)]">
                {DIGITAL_GARAGE_POST_SIGNUP_HINT}
              </p>
            ) : null}

            <Button
              type="submit"
              disabled={pending}
              size="lg"
              className={AUTH_PRIMARY_BUTTON_CLASS}
            >
              {pending
                ? "Bitte warten…"
                : isSignup
                  ? "Konto erstellen"
                  : "Anmelden"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {!isDigitalGarage ? (
        <>
          <p className="mx-4 text-center text-sm text-muted-foreground sm:mx-auto">
            Digitale Garage ohne Tag?{" "}
            <a
              href="/register"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              Kostenlos registrieren
            </a>
            {" · "}
            Tag am Auto? QR scannen.
          </p>

          <LegalFooterNav
            className="mx-4 text-xs text-muted-foreground sm:mx-auto [&_a]:text-muted-foreground"
          />
        </>
      ) : null}
    </>
  );

  if (isDigitalGarage) {
    return shell;
  }

  return (
    <ScanContent className="mx-auto w-full max-w-md gap-4 overflow-x-clip pb-12 px-0 pt-0 sm:px-0">
      {shell}
    </ScanContent>
  );
}
