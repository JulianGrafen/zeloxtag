"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, ShieldCheck } from "lucide-react";

import { ScanContent } from "@/components/layout/scan-content";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
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

import { OAuthSignInButtons } from "./oauth-sign-in-buttons";

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
      ? "2FA wurde mit einem Recovery-Code deaktiviert. Melde dich an und richte 2FA unter Einstellungen neu ein."
      : null,
  );
  const [pending, startTransition] = useTransition();

  const isSignup = tab === "signup";
  const tabs: Array<{ id: AuthTab; label: string; icon: typeof KeyRound }> = [
    { id: "password", label: "Anmelden", icon: KeyRound },
    { id: "signup", label: "Registrieren", icon: ShieldCheck },
  ];

  return (
    <ScanContent className="mx-auto w-full max-w-md gap-5 pb-12 pt-[max(1.75rem,env(safe-area-inset-top))]">
      <Card className="w-full overflow-hidden">
        <CardHeader className="border-b border-border/70 pb-5">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ShieldCheck className="h-5 w-5" aria-hidden />
          </div>
          <CardTitle className="font-[family-name:var(--font-display)] text-2xl tracking-tight">
            ZeloxTag
          </CardTitle>
          <CardDescription>
            {isSignup
              ? "Erstelle dein Konto für die digitale Fahrzeugakte."
              : "Melde dich an, um deine digitale Fahrzeugakte zu öffnen."}
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-5">
          <div
            className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1"
            role="tablist"
            aria-label="Anmeldung oder Registrierung"
          >
            {tabs.map(({ id, label, icon: Icon }) => {
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
                    "min-h-10 w-full justify-center gap-1.5 rounded-lg px-3",
                    !selected && "bg-transparent hover:bg-background/70",
                  )}
                  onClick={() => {
                    setTab(id);
                    setMessage(null);
                    setInfo(null);
                  }}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden />
                  <span>{label}</span>
                </Button>
              );
            })}
          </div>

          <form
            className="mt-5 flex w-full flex-col gap-4"
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
                  placeholder="Mindestens 10 Zeichen"
                  className={AUTH_FIELD_CLASS}
                />
              </AuthField>
            </div>

            <div className="flex min-h-5 w-full items-center justify-end">
              {!isSignup ? (
                <a
                  href="/login/reset"
                  className="text-sm text-muted-foreground underline-offset-4 hover:underline"
                >
                  Passwort vergessen?
                </a>
              ) : null}
            </div>

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

            <div
              className={cn(
                "min-h-[3.25rem] w-full text-xs leading-relaxed text-muted-foreground",
                !isSignup && "invisible",
              )}
              aria-hidden={!isSignup}
            >
              Mit der Registrierung akzeptierst du unsere{" "}
              <a href="/agb" className="underline-offset-4 hover:underline">
                AGB
              </a>{" "}
              und nimmst unsere{" "}
              <a
                href="/datenschutz"
                className="underline-offset-4 hover:underline"
              >
                Datenschutzerklärung
              </a>{" "}
              zur Kenntnis.
            </div>

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

            <div className="relative w-full py-1">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">oder</span>
              </div>
            </div>

            <OAuthSignInButtons nextPath={nextPath || "/auth/continue"} />
          </form>
        </CardContent>
      </Card>

      <p className="text-center text-sm leading-relaxed text-muted-foreground">
        Neuer Tag? Scanne den QR-Code am Fahrzeug, um ihn zu beanspruchen.
      </p>

      <nav
        aria-label="Rechtliches"
        className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-muted-foreground"
      >
        <a href="/impressum" className="underline-offset-4 hover:underline">
          Impressum
        </a>
        <a href="/datenschutz" className="underline-offset-4 hover:underline">
          Datenschutz
        </a>
        <a href="/agb" className="underline-offset-4 hover:underline">
          AGB
        </a>
      </nav>
    </ScanContent>
  );
}
