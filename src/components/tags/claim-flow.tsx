"use client";

import { useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";

import { claimTag } from "@/actions/claim-tag";
import { ScanContent } from "@/components/layout/scan-content";
import { ClaimProgressBar } from "@/components/tags/claim-progress-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  claimWizardPreviousStep,
  type ClaimWizardStep,
} from "@/lib/tags/claim-flow-steps";
import {
  VEHICLE_DRIVETRAIN_TYPES,
  VEHICLE_FUEL_TYPES,
} from "@/lib/vehicles/tech-specs";
import { cn } from "@/lib/utils";

interface ClaimFlowProps {
  tagUuid: string;
  isAuthenticated?: boolean;
  userEmail?: string | null;
}

export function ClaimFlow({
  tagUuid,
  isAuthenticated = false,
  userEmail = null,
}: ClaimFlowProps) {
  const [step, setStep] = useState<ClaimWizardStep>("intro");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [vin, setVin] = useState("");
  const [powerPs, setPowerPs] = useState("");
  const [displacementCc, setDisplacementCc] = useState("");
  const [drivetrain, setDrivetrain] = useState("");
  const [fuelType, setFuelType] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState(userEmail ?? "");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const needsAccount = !isAuthenticated;

  function goBack() {
    setError(null);
    setInfo(null);
    setStep(claimWizardPreviousStep(step, needsAccount));
  }

  function validateMakeModel(): string | null {
    if (!make.trim()) return "Marke ist erforderlich.";
    if (!model.trim()) return "Modell ist erforderlich.";
    return null;
  }

  function validateYear(): string | null {
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

  function validateVehicle(): string | null {
    return validateMakeModel() ?? validateYear();
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
      setStep(validateMakeModel() ? "makeModel" : "year");
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
          techSpecs: {
            powerPs: powerPs.trim() || undefined,
            displacementCc: displacementCc.trim() || undefined,
            drivetrain: drivetrain.trim() || undefined,
            fuelType: fuelType.trim() || undefined,
          },
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
        <ClaimProgressBar step={step} needsAccount={needsAccount} />
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
            <Button type="button" onClick={() => setStep("makeModel")}>
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

      {step === "makeModel" ? (
        <SlidePanel
          kicker="Schritt 1 von 4"
          title="Marke & Modell"
          copy="Wie heißt dein Fahrzeug? Das steht gleich auf deiner digitalen Visitenkarte."
        >
          <form
            className="mt-6 grid w-full gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              setError(null);
              const validationError = validateMakeModel();
              if (validationError) {
                setError(validationError);
                return;
              }
              setStep("year");
            }}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                id="claim-make"
                label="Marke"
                value={make}
                onChange={setMake}
                placeholder="Toyota"
                required
              />
              <Field
                id="claim-model"
                label="Modell"
                value={model}
                onChange={setModel}
                placeholder="Supra"
                required
              />
            </div>
            <SlideActions
              error={error}
              pending={pending}
              onBack={goBack}
              submitLabel="Weiter"
              showBack
            />
          </form>
        </SlidePanel>
      ) : null}

      {step === "year" ? (
        <SlidePanel
          kicker="Schritt 2 von 4"
          title="Baujahr"
          copy="Das Baujahr hilft bei der Zuordnung deiner Dokumente. Die VIN kannst du optional ergänzen."
        >
          <form
            className="mt-6 grid w-full gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              setError(null);
              const validationError = validateYear();
              if (validationError) {
                setError(validationError);
                return;
              }
              setStep("power");
            }}
          >
            <Field
              id="claim-year"
              label="Baujahr"
              value={year}
              onChange={setYear}
              inputMode="numeric"
              placeholder="2011"
              required
            />
            <Field
              id="claim-vin"
              label="VIN (optional)"
              value={vin}
              onChange={setVin}
              placeholder="Fahrgestellnummer"
            />
            <SlideActions
              error={error}
              pending={pending}
              onBack={goBack}
              submitLabel="Weiter"
              showBack
            />
          </form>
        </SlidePanel>
      ) : null}

      {step === "power" ? (
        <SlidePanel
          kicker="Schritt 3 von 4"
          title="Leistung & Hubraum"
          copy="Optional — du kannst die Werte auch später unter Fahrzeugdaten ergänzen."
        >
          <form
            className="mt-6 grid w-full gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              setError(null);
              setStep("drivetrain");
            }}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                id="claim-power-ps"
                label="PS"
                value={powerPs}
                onChange={setPowerPs}
                inputMode="numeric"
                placeholder="231"
              />
              <Field
                id="claim-displacement"
                label="Hubraum (ccm)"
                value={displacementCc}
                onChange={setDisplacementCc}
                inputMode="numeric"
                placeholder="2998"
              />
            </div>
            <SlideActions
              error={error}
              pending={pending}
              onBack={goBack}
              submitLabel="Weiter"
              showBack
            />
          </form>
        </SlidePanel>
      ) : null}

      {step === "drivetrain" ? (
        <SlidePanel
          kicker="Schritt 4 von 4"
          title="Antrieb & Kraftstoff"
          copy={
            needsAccount
              ? "Optional. Als Nächstes legst du dein Konto an."
              : "Optional. Danach wird dein Tag sofort aktiviert."
          }
        >
          <form
            className="mt-6 grid w-full gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              setError(null);
              if (needsAccount) {
                setStep("account");
                return;
              }
              submitClaim();
            }}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SelectField
                id="claim-drivetrain"
                label="Antrieb"
                value={drivetrain}
                onChange={setDrivetrain}
                options={VEHICLE_DRIVETRAIN_TYPES}
              />
              <SelectField
                id="claim-fuel-type"
                label="Kraftstoff"
                value={fuelType}
                onChange={setFuelType}
                options={VEHICLE_FUEL_TYPES}
              />
            </div>
            <SlideActions
              error={error}
              pending={pending}
              onBack={goBack}
              submitLabel={
                needsAccount
                  ? "Weiter zum Konto"
                  : pending
                    ? "Verknüpfen…"
                    : "Tag aktivieren"
              }
              submitIcon={needsAccount ? "next" : "check"}
              showBack
            />
          </form>
        </SlidePanel>
      ) : null}

      {step === "account" ? (
        <SlidePanel
          kicker="Konto"
          title="Konto anlegen"
          copy="Damit bleiben Fahrzeug und Dokumente sicher mit dir verknüpft."
        >
          <form
            className="mt-6 grid w-full gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              submitClaim();
            }}
          >
            <Field
              id="claim-account-name"
              label="Name (optional)"
              value={name}
              onChange={setName}
              placeholder="Dein Name"
              autoComplete="name"
            />
            <Field
              id="claim-account-email"
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
              id="claim-account-password"
              label="Passwort"
              value={password}
              onChange={setPassword}
              type="password"
              placeholder="Mindestens 10 Zeichen"
              required
              autoComplete="new-password"
            />
            <Field
              id="claim-account-password-confirm"
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

            <SlideActions
              error={null}
              pending={pending}
              onBack={goBack}
              submitLabel={pending ? "Konto wird angelegt…" : "Konto anlegen & starten"}
              submitIcon="check"
              showBack
            />
          </form>
        </SlidePanel>
      ) : null}
    </ClaimShell>
  );
}

function SlidePanel({
  kicker,
  title,
  copy,
  children,
}: {
  kicker: string;
  title: string;
  copy: string;
  children: ReactNode;
}) {
  return (
    <section className="claim-panel vd-anim-header">
      <header>
        <p className="claim-kicker">{kicker}</p>
        <h1 className="claim-title mt-2">{title}</h1>
        <p className="claim-copy mt-2">{copy}</p>
      </header>
      {children}
    </section>
  );
}

function SlideActions({
  error,
  pending,
  onBack,
  submitLabel,
  submitIcon = "next",
  showBack,
}: {
  error: string | null;
  pending: boolean;
  onBack: () => void;
  submitLabel: string;
  submitIcon?: "next" | "check";
  showBack?: boolean;
}) {
  return (
    <>
      {error ? (
        <p role="alert" className="vd-alert-error">
          {error}
        </p>
      ) : null}
      <div className="flex gap-2 pt-1">
        {showBack ? (
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            disabled={pending}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Zurück
          </Button>
        ) : null}
        <Button type="submit" disabled={pending} className="flex-1">
          {submitLabel}
          {submitIcon === "check" ? (
            <Check className="h-4 w-4" aria-hidden />
          ) : (
            <ArrowRight className="h-4 w-4" aria-hidden />
          )}
        </Button>
      </div>
    </>
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

function ClaimFormField({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="grid w-full gap-2">
      <Label
        htmlFor={htmlFor}
        className="text-[0.72rem] font-medium tracking-[0.14em] text-[color:var(--vd-muted)] uppercase"
      >
        {label}
      </Label>
      {children}
    </div>
  );
}

const CLAIM_FIELD_CLASS = "min-h-11 w-full";

function Field({
  id,
  label,
  value,
  onChange,
  type = "text",
  inputMode,
  required,
  placeholder,
  autoComplete,
}: {
  id: string;
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
    <ClaimFormField label={label} htmlFor={id}>
      <Input
        id={id}
        type={type}
        inputMode={inputMode}
        required={required}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={CLAIM_FIELD_CLASS}
        onChange={(event) => onChange(event.target.value)}
      />
    </ClaimFormField>
  );
}

function SelectField({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
}) {
  return (
    <ClaimFormField label={label} htmlFor={id}>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={cn("claim-input", CLAIM_FIELD_CLASS)}
      >
        <option value="">—</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </ClaimFormField>
  );
}
