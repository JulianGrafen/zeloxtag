"use client";

import { useState, useTransition } from "react";

import { claimTag } from "@/actions/claim-tag";
import { ClaimProgressBar } from "@/components/tags/claim-progress-bar";
import {
  ClaimField,
  ClaimSelectField,
  ClaimSlideActions,
} from "@/components/tags/claim/claim-form-fields";
import type { ClaimTransitionDirection } from "@/components/tags/claim/claim-motion";
import { ClaimIntroHero } from "@/components/tags/claim/ClaimIntroHero";
import { ClaimShell } from "@/components/tags/claim/ClaimShell";
import { ClaimStepTransition } from "@/components/tags/claim/ClaimStepTransition";
import { ClaimTwinPreviewCard } from "@/components/tags/claim/ClaimTwinPreviewCard";
import { ClaimWizardPanel } from "@/components/tags/claim/ClaimWizardPanel";
import { DEFAULT_OIL_INTERVAL_KM, DEFAULT_OIL_INTERVAL_MONTHS } from "@/lib/documents/oil-changes";
import { formatMileageKmNumber } from "@/lib/documents/format";
import {
  claimWizardPreviousStep,
  claimWizardStepIndex,
  claimWizardTotalSteps,
  type ClaimWizardStep,
} from "@/lib/tags/claim-flow-steps";
import {
  VEHICLE_DRIVETRAIN_TYPES,
  VEHICLE_FUEL_TYPES,
  OIL_CHANGE_INTERVAL_KM_OPTIONS,
  OIL_CHANGE_INTERVAL_MONTHS_OPTIONS,
  formatOilChangeIntervalMonthsLabel,
} from "@/lib/vehicles/tech-specs";

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
  const [transitionDirection, setTransitionDirection] =
    useState<ClaimTransitionDirection>("forward");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [vin, setVin] = useState("");
  const [powerPs, setPowerPs] = useState("");
  const [displacementCc, setDisplacementCc] = useState("");
  const [drivetrain, setDrivetrain] = useState("");
  const [fuelType, setFuelType] = useState("");
  const [oilChangeIntervalKm, setOilChangeIntervalKm] = useState(
    String(DEFAULT_OIL_INTERVAL_KM),
  );
  const [oilChangeIntervalMonths, setOilChangeIntervalMonths] = useState(
    String(DEFAULT_OIL_INTERVAL_MONTHS),
  );
  const [name, setName] = useState("");
  const [email, setEmail] = useState(userEmail ?? "");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const needsAccount = !isAuthenticated;

  function stepKicker(currentStep: ClaimWizardStep): string {
    const index = claimWizardStepIndex(currentStep, needsAccount);
    const total = claimWizardTotalSteps(needsAccount);
    return `Schritt ${index} von ${total}`;
  }

  function advance(next: ClaimWizardStep) {
    setTransitionDirection("forward");
    setError(null);
    setInfo(null);
    setStep(next);
  }

  function validateOilInterval(): string | null {
    if (!oilChangeIntervalKm.trim()) {
      return "Bitte ein Ölwechsel-Intervall wählen.";
    }
    if (!oilChangeIntervalMonths.trim()) {
      return "Bitte ein Monats-Intervall wählen.";
    }
    return null;
  }

  function goBack() {
    setTransitionDirection("back");
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
            oilChangeIntervalKm,
            oilChangeIntervalMonths,
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

  const showWizardChrome = step !== "intro";

  return (
    <ClaimShell intro={step === "intro"}>
      {showWizardChrome ? (
        <ClaimProgressBar step={step} needsAccount={needsAccount} />
      ) : null}

      {showWizardChrome ? (
        <ClaimTwinPreviewCard make={make} model={model} year={year} />
      ) : null}

      <ClaimStepTransition step={step} direction={transitionDirection}>
        {step === "intro" ? (
          <ClaimIntroHero
            tagUuid={tagUuid}
            needsAccount={needsAccount}
            isAuthenticated={isAuthenticated}
            userEmail={userEmail}
            onStart={() => advance("makeModel")}
          />
        ) : null}

        {step === "makeModel" ? (
          <ClaimWizardPanel
            kicker={stepKicker("makeModel")}
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
                advance("year");
              }}
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <ClaimField
                  id="claim-make"
                  label="Marke"
                  value={make}
                  onChange={setMake}
                  placeholder="Toyota"
                  required
                />
                <ClaimField
                  id="claim-model"
                  label="Modell"
                  value={model}
                  onChange={setModel}
                  placeholder="Supra"
                  required
                />
              </div>
              <ClaimSlideActions
                error={error}
                pending={pending}
                onBack={goBack}
                submitLabel="Weiter"
                showBack
              />
            </form>
          </ClaimWizardPanel>
        ) : null}

        {step === "year" ? (
          <ClaimWizardPanel
            kicker={stepKicker("year")}
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
                advance("power");
              }}
            >
              <ClaimField
                id="claim-year"
                label="Baujahr"
                value={year}
                onChange={setYear}
                inputMode="numeric"
                placeholder="2011"
                required
              />
              <ClaimField
                id="claim-vin"
                label="VIN (optional)"
                value={vin}
                onChange={setVin}
                placeholder="Fahrgestellnummer"
              />
              <ClaimSlideActions
                error={error}
                pending={pending}
                onBack={goBack}
                submitLabel="Weiter"
                showBack
              />
            </form>
          </ClaimWizardPanel>
        ) : null}

        {step === "power" ? (
          <ClaimWizardPanel
            kicker={stepKicker("power")}
            title="Leistung & Hubraum"
            copy="Optional — du kannst die Werte auch später unter Fahrzeugdaten ergänzen."
          >
            <form
              className="mt-6 grid w-full gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                setError(null);
                advance("drivetrain");
              }}
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <ClaimField
                  id="claim-power-ps"
                  label="PS"
                  value={powerPs}
                  onChange={setPowerPs}
                  inputMode="numeric"
                  placeholder="231"
                />
                <ClaimField
                  id="claim-displacement"
                  label="Hubraum (ccm)"
                  value={displacementCc}
                  onChange={setDisplacementCc}
                  inputMode="numeric"
                  placeholder="2998"
                />
              </div>
              <ClaimSlideActions
                error={error}
                pending={pending}
                onBack={goBack}
                submitLabel="Weiter"
                showBack
              />
            </form>
          </ClaimWizardPanel>
        ) : null}

        {step === "drivetrain" ? (
          <ClaimWizardPanel
            kicker={stepKicker("drivetrain")}
            title="Antrieb & Kraftstoff"
            copy="Optional. Als Nächstes legst du dein Ölwechsel-Intervall fest."
          >
            <form
              className="mt-6 grid w-full gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                setError(null);
                advance("oilInterval");
              }}
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <ClaimSelectField
                  id="claim-drivetrain"
                  label="Antrieb"
                  value={drivetrain}
                  onChange={setDrivetrain}
                  options={VEHICLE_DRIVETRAIN_TYPES}
                />
                <ClaimSelectField
                  id="claim-fuel-type"
                  label="Kraftstoff"
                  value={fuelType}
                  onChange={setFuelType}
                  options={VEHICLE_FUEL_TYPES}
                />
              </div>
              <ClaimSlideActions
                error={error}
                pending={pending}
                onBack={goBack}
                submitLabel="Weiter"
                showBack
              />
            </form>
          </ClaimWizardPanel>
        ) : null}

        {step === "oilInterval" ? (
          <ClaimWizardPanel
            kicker={stepKicker("oilInterval")}
            title="Ölwechsel-Intervall"
            copy="Wie oft soll der nächste Ölwechsel fällig sein? Standard ist 10.000 km — du kannst es später in den Fahrzeugdaten anpassen."
          >
            <form
              className="mt-6 grid w-full gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                setError(null);
                const validationError = validateOilInterval();
                if (validationError) {
                  setError(validationError);
                  return;
                }
                if (needsAccount) {
                  advance("account");
                  return;
                }
                submitClaim();
              }}
            >
              <ClaimSelectField
                id="claim-oil-interval-km"
                label="Intervall (km)"
                value={oilChangeIntervalKm}
                onChange={setOilChangeIntervalKm}
                required
                options={OIL_CHANGE_INTERVAL_KM_OPTIONS.map((km) => ({
                  value: String(km),
                  label: `${formatMileageKmNumber(km)} km`,
                }))}
              />
              <ClaimSelectField
                id="claim-oil-interval-months"
                label="Intervall (Monate)"
                value={oilChangeIntervalMonths}
                onChange={setOilChangeIntervalMonths}
                required
                options={OIL_CHANGE_INTERVAL_MONTHS_OPTIONS.map((months) => ({
                  value: String(months),
                  label: formatOilChangeIntervalMonthsLabel(months),
                }))}
              />
              <ClaimSlideActions
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
          </ClaimWizardPanel>
        ) : null}

        {step === "account" ? (
          <ClaimWizardPanel
            kicker="Fast geschafft"
            title="Konto anlegen"
            copy="Du gehörst gleich zur ZeloxTag-Community. Damit bleiben Fahrzeug und Dokumente sicher mit dir verknüpft."
          >
            <form
              className="mt-6 grid w-full gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                submitClaim();
              }}
            >
              <ClaimField
                id="claim-account-name"
                label="Name (optional)"
                value={name}
                onChange={setName}
                placeholder="Dein Name"
                autoComplete="name"
              />
              <ClaimField
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
              <ClaimField
                id="claim-account-password"
                label="Passwort"
                value={password}
                onChange={setPassword}
                type="password"
                placeholder="Mindestens 10 Zeichen"
                required
                autoComplete="new-password"
              />
              <ClaimField
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

              <ClaimSlideActions
                error={null}
                pending={pending}
                onBack={goBack}
                submitLabel={
                  pending ? "Konto wird angelegt…" : "Konto anlegen & starten"
                }
                submitIcon="check"
                showBack
              />
            </form>
          </ClaimWizardPanel>
        ) : null}
      </ClaimStepTransition>
    </ClaimShell>
  );
}
