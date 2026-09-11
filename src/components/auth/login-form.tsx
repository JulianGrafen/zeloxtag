"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { ScanContent } from "@/components/layout/scan-content";
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
import { cn } from "@/lib/utils";

type AuthTab = "password" | "signup";

interface LoginFormProps {
  nextPath?: string;
  initialError?: string;
  /** Shown after MFA recovery code disabled 2FA. */
  recovered?: boolean;
  initialTab?: AuthTab;
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
}: LoginFormProps) {
  const router = useRouter();
  const [tab, setTab] = useState<AuthTab>(initialTab);
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

  return (
    <ScanContent className="mx-auto w-full max-w-md gap-4 pb-12 pt-[max(1.75rem,env(safe-area-inset-top))]">
      <Card className="w-full overflow-hidden">
        <CardHeader className="border-b border-border/70 pb-4 pt-6">
          <CardTitle className="font-[family-name:var(--font-display)] text-2xl tracking-tight">
            ZeloxTag
          </CardTitle>
        </CardHeader>

        <CardContent className="pt-4">
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

            {isSignup ? (
              <p className="text-xs leading-relaxed text-muted-foreground">
                Mit „Konto erstellen“ akzeptierst du die{" "}
                <a href="/agb" className="underline-offset-4 hover:underline">
                  AGB
                </a>{" "}
                und{" "}
                <a
                  href="/datenschutz"
                  className="underline-offset-4 hover:underline"
                >
                  Datenschutz
                </a>
                .
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

      <p className="text-center text-sm text-muted-foreground">
        Neuer Tag? QR am Fahrzeug scannen.
      </p>

      <LegalFooterNav className="text-xs text-muted-foreground [&_a]:text-muted-foreground" />
    </ScanContent>
  );
}
