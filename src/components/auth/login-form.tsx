"use client";

import { useState, useTransition } from "react";
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
import { cn } from "@/lib/utils";
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
    <ScanContent className="mx-auto w-full max-w-md gap-5 pb-12 pt-[max(1.75rem,env(safe-area-inset-top))]">
      <Card>
        <CardHeader>
          <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ShieldCheck className="h-5 w-5" aria-hidden />
          </div>
          <CardTitle className="font-[family-name:var(--font-display)] text-2xl tracking-tight">
            ZeloxTag
          </CardTitle>
          <CardDescription>
            Melde dich an, um deine digitale Fahrzeugakte zu öffnen.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card size="sm">
        <CardContent className="grid grid-cols-2 gap-1 p-1">
          {tabs.map(({ id, label, icon: Icon }) => (
            <Button
              key={id}
              type="button"
              variant={tab === id ? "default" : "ghost"}
              size="sm"
              className="min-h-10"
              onClick={() => {
                setTab(id);
                setMessage(null);
                setInfo(null);
              }}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden />
              {label}
            </Button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-(--card-spacing)">
          <form
            className="space-y-4"
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
                  if (result.status === "confirm_email") {
                    setInfo(result.message);
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
            <div className="space-y-2">
              <Label htmlFor="login-email">E-Mail</Label>
              <Input
                id="login-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="du@beispiel.de"
                className="min-h-10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="login-password">Passwort</Label>
              <Input
                id="login-password"
                type="password"
                required
                minLength={10}
                autoComplete={
                  tab === "signup" ? "new-password" : "current-password"
                }
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Mindestens 10 Zeichen"
                className="min-h-10"
              />
            </div>

            {tab === "password" ? (
              <div className="flex justify-end">
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
                className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {message}
              </p>
            ) : null}
            {info ? (
              <p className="rounded-lg border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
                {info}
              </p>
            ) : null}

            {tab === "signup" ? (
              <p className="text-xs leading-relaxed text-muted-foreground">
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
              </p>
            ) : null}

            <Button
              type="submit"
              disabled={pending}
              size="lg"
              className="min-h-11 w-full"
            >
              {pending
                ? "Bitte warten…"
                : tab === "signup"
                  ? "Konto erstellen"
                  : "Anmelden"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <p className="text-center text-sm leading-relaxed text-muted-foreground">
        Neuer Tag? Scanne den QR-Code am Fahrzeug, um ihn zu beanspruchen.
      </p>

      <p className="text-center text-sm text-muted-foreground">
        <a
          href="/demo"
          className={cn(
            "font-medium text-foreground underline decoration-border underline-offset-4",
            "transition hover:decoration-foreground",
          )}
        >
          Demo ansehen
        </a>
        <span> · BMW E36 328i Showcase</span>
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
