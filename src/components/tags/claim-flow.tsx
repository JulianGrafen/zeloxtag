"use client";

import { useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, ShieldCheck } from "lucide-react";

import { claimTag } from "@/actions/claim-tag";
import { ScanContent } from "@/components/layout/scan-content";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ClaimFlowProps {
  tagUuid: string;
  isAuthenticated?: boolean;
  userEmail?: string | null;
}

type Step = "intro" | "vehicle" | "account";

export function ClaimFlow({
  tagUuid,
  isAuthenticated = false,
  userEmail = null,
}: ClaimFlowProps) {
  const [step, setStep] = useState<Step>("intro");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [vin, setVin] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState(userEmail ?? "");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const needsAccount = !isAuthenticated;
  const stepCount = needsAccount ? 2 : 1;
  const stepIndex = step === "vehicle" ? 1 : step === "account" ? 2 : 0;

  function validateVehicle(): string | null {
    if (!make.trim()) return "Marke ist erforderlich.";
    if (!model.trim()) return "Modell ist erforderlich.";
    const parsedYear = Number.parseInt(year, 10);
    if (!Number.isFinite(parsedYear) || parsedYear < 1900 || parsedYear > 2100) {
      return "Baujahr muss zwischen 1900 und 2100 liegen.";
    }
    const trimmedVin = vin.trim();
    if (trimmedVin && (trimmedVin.length < 5 || trimmedVin.length > 32)) {
      return "VIN muss zwischen 5 und 32 Zeichen liegen.";
    }
    return null;
  }

  function validateAccount(): string | null {
    if (!email.trim() || !email.includes("@")) {
      return "Gültige E-Mail erforderlich.";
    }
    if (password.length < 10) {
      return "Passwort muss mindestens 10 Zeichen haben.";
    }
    if (password !== passwordConfirm) {
      return "Passwörter stimmen nicht überein.";
    }
    return null;
  }

  function submitClaim() {
    setError(null);
    setInfo(null);

    const vehicleError = validateVehicle();
    if (vehicleError) {
      setError(vehicleError);
      setStep("vehicle");
      return;
    }

    if (needsAccount) {
      const accountError = validateAccount();
      if (accountError) {
        setError(accountError);
        setStep("account");
        return;
      }
    }

    startTransition(async () => {
      try {
        const result = await claimTag({
          tagUuid,
          make,
          model,
          year,
          vin: vin.trim() || undefined,
          ...(needsAccount
            ? {
                email: email.trim(),
                password,
                name: name.trim() || undefined,
              }
            : {}),
        });

        if (result.status === "error") {
          setError(result.message);
          return;
        }

        if (result.status === "confirm_email") {
          setInfo(result.message);
          return;
        }

        // Hard navigation: Soft Router can stall after Server Actions on LAN/mobile.
        window.location.assign(result.href);
      } catch (submitError) {
        setError(
          submitError instanceof Error
            ? submitError.message
            : "Weiterleitung fehlgeschlagen.",
        );
      }
    });
  }

  return (
    <ClaimShell>
      {step !== "intro" ? (
        <div
          className="mb-5 flex items-center gap-2 vd-anim-header"
          aria-label={`Schritt ${stepIndex} von ${stepCount}`}
        >
          {Array.from({ length: stepCount }, (_, index) => (
            <div key={index} className="vd-step-progress">
              <div
                className="vd-step-progress__fill"
                style={{ width: index < stepIndex ? "100%" : "0%" }}
              />
            </div>
          ))}
        </div>
      ) : null}

      {step === "intro" ? (
        <section className="claim-intro flex flex-col py-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="vd-anim-header space-y-4 pt-2">
            <h1 className="font-[family-name:var(--font-display)] text-[2.75rem] font-semibold leading-none tracking-[-0.05em] text-[color:var(--vd-text)] sm:text-[3.15rem]">
              ZeloxTag
            </h1>
            <p className="max-w-[18ch] font-[family-name:var(--font-display)] text-[1.35rem] font-medium leading-snug tracking-[-0.03em] text-[color:var(--vd-text)]">
              Dein Fahrzeug. Ein Scan entfernt.
            </p>
            <p className="max-w-[34ch] text-[0.95rem] leading-relaxed text-[color:var(--vd-muted)]">
              {needsAccount
                ? "Beim ersten Scan legst du ein Konto an und verknüpfst den Edelstahl-Tag mit deinem Auto. Die digitale Visitenkarte und deine Akte mit manuellen Einträgen sind kostenlos — KI-Scan und Exposé optional mit Pro."
                : "Verknüpfe den Tag mit deinem Auto. Danach landest du direkt auf deinem Dashboard — ohne Zahlung. Pro brauchst du nur für KI-Scan und Exposé."}
            </p>
          </div>

          <div className="vd-anim-stack mt-8 space-y-3.5">
            <SteelTagPlate />
            {isAuthenticated && userEmail ? (
              <p className="vd-tile px-4 py-3 text-[0.82rem] text-[color:var(--vd-muted)]">
                Angemeldet als{" "}
                <span className="font-medium text-[color:var(--vd-text)]">
                  {userEmail}
                </span>
              </p>
            ) : null}
            <Button type="button" onClick={() => setStep("vehicle")}>
              Tag beanspruchen
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
            <Link href="/" className="claim-later">
              Später fortfahren
            </Link>
            {!isAuthenticated ? (
              <Link
                href={`/login?next=${encodeURIComponent(`/v/${tagUuid}`)}`}
                className="claim-later"
              >
                Bereits ein Konto? Anmelden
              </Link>
            ) : null}
          </div>
        </section>
      ) : null}

      {step === "vehicle" ? (
        <section className="claim-panel vd-anim-header">
          <header>
            <p className="claim-kicker">Fahrzeugdaten</p>
            <h1 className="claim-title mt-2">Fahrzeug verknüpfen</h1>
            <p className="claim-copy mt-2">
              Marke, Modell und Baujahr reichen für den Start.
              {needsAccount
                ? " Als Nächstes legst du dein Konto an."
                : " Danach geht’s direkt zu deinem Dashboard."}
            </p>
          </header>

          <form
            className="mt-6 space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              setError(null);
              const vehicleError = validateVehicle();
              if (vehicleError) {
                setError(vehicleError);
                return;
              }
              if (needsAccount) {
                setStep("account");
                return;
              }
              submitClaim();
            }}
          >
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Marke"
                value={make}
                onChange={setMake}
                placeholder="Toyota"
                required
              />
              <Field
                label="Modell"
                value={model}
                onChange={setModel}
                placeholder="Supra"
                required
              />
            </div>

            <Field
              label="Baujahr"
              value={year}
              onChange={setYear}
              inputMode="numeric"
              placeholder="2011"
              required
            />

            <Field
              label="VIN (optional)"
              value={vin}
              onChange={setVin}
              placeholder="Fahrgestellnummer"
            />

            {error ? (
              <p role="alert" className="vd-alert-error">
                {error}
              </p>
            ) : null}

            <div className="flex gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setError(null);
                  setStep("intro");
                }}
                disabled={pending}
              >
                <ArrowLeft className="h-4 w-4" aria-hidden />
                Zurück
              </Button>
              <Button type="submit" disabled={pending} className="flex-1">
                {needsAccount
                  ? "Weiter zum Konto"
                  : pending
                    ? "Verknüpfen…"
                    : "Tag aktivieren"}
                {needsAccount ? (
                  <ArrowRight className="h-4 w-4" aria-hidden />
                ) : (
                  <Check className="h-4 w-4" aria-hidden />
                )}
              </Button>
            </div>
          </form>
        </section>
      ) : null}

      {step === "account" ? (
        <section className="claim-panel vd-anim-header">
          <header>
            <div className="vd-icon-badge h-11 w-11">
              <ShieldCheck className="h-5 w-5" aria-hidden />
            </div>
            <p className="claim-kicker mt-4">Konto</p>
            <h1 className="claim-title mt-2">Konto anlegen</h1>
            <p className="claim-copy mt-2">
              Damit bleiben Fahrzeug und Dokumente sicher mit dir verknüpft.
              Hast du schon ein Konto, melden wir dich mit E-Mail und Passwort an.
            </p>
          </header>

          <form
            className="mt-6 space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              submitClaim();
            }}
          >
            <Field
              label="Name (optional)"
              value={name}
              onChange={setName}
              placeholder="Dein Name"
              autoComplete="name"
            />
            <Field
              label="E-Mail"
              value={email}
              onChange={setEmail}
              type="email"
              inputMode="email"
              placeholder="du@beispiel.de"
              required
              autoComplete="email"
            />
            <Field
              label="Passwort"
              value={password}
              onChange={setPassword}
              type="password"
              placeholder="Mindestens 10 Zeichen"
              required
              autoComplete="new-password"
            />
            <Field
              label="Passwort bestätigen"
              value={passwordConfirm}
              onChange={setPasswordConfirm}
              type="password"
              placeholder="Passwort wiederholen"
              required
              autoComplete="new-password"
            />

            {error ? (
              <p role="alert" className="vd-alert-error">
                {error}
              </p>
            ) : null}
            {info ? (
              <p role="status" className="text-sm text-muted-foreground">
                {info}
              </p>
            ) : null}

            <div className="flex gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setError(null);
                  setInfo(null);
                  setStep("vehicle");
                }}
                disabled={pending}
              >
                <ArrowLeft className="h-4 w-4" aria-hidden />
                Zurück
              </Button>
              <Button type="submit" disabled={pending} className="flex-1">
                {pending ? "Konto wird angelegt…" : "Konto anlegen & starten"}
                <Check className="h-4 w-4" aria-hidden />
              </Button>
            </div>
          </form>
        </section>
      ) : null}
    </ClaimShell>
  );
}

function ClaimShell({ children }: { children: ReactNode }) {
  return <ScanContent>{children}</ScanContent>;
}

function SteelTagPlate() {
  return (
    <div className="claim-steel" aria-label="ZeloxTag">
      <div className="claim-steel__grain" aria-hidden />
      <div className="relative z-10 flex items-center gap-4">
        <div className="claim-steel__qr" aria-hidden>
          <span />
          <span />
          <span />
          <span />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[0.65rem] font-semibold tracking-[0.2em] text-white/55 uppercase">
            Unclaimed
          </p>
          <p className="mt-1 text-[0.82rem] tracking-wide text-white/90">
            ZeloxTag
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  inputMode,
  required,
  placeholder,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  inputMode?: "numeric" | "email" | "text";
  required?: boolean;
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <Label>
      <span className="text-[0.72rem] font-medium tracking-[0.14em] text-[color:var(--vd-muted)] uppercase">
        {label}
      </span>
      <Input
        type={type}
        inputMode={inputMode}
        required={required}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        onChange={(event) => onChange(event.target.value)}
      />
    </Label>
  );
}
