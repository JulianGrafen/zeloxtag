"use client";

import { useState, useTransition } from "react";

import { claimTag } from "@/actions/claim-tag";
import { createDigitalGarageVehicle } from "@/actions/create-digital-garage-vehicle";
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
import { PrimaryGoalOptionList } from "@/components/onboarding/primary-goal-option-list";
import {
  writePrimaryGoal,
  type ZeloxPrimaryGoal,
} from "@/lib/onboarding/primary-goal";
import { AuthLegalConsentNotice } from "@/components/legal/auth-legal-consent-notice";
import { ClaimTwinPreviewCard } from "@/components/tags/claim/ClaimTwinPreviewCard";
import { BuildPersonalityChipPicker } from "@/components/tags/claim/BuildPersonalityChipPicker";
import { ClaimWizardPanel } from "@/components/tags/claim/ClaimWizardPanel";
import { ClaimVehiclePhotoPicker } from "@/components/tags/claim/ClaimVehiclePhotoPicker";
import {
  clearOnboardingVehiclePhotoSkipped,
  clearPendingOnboardingVehiclePhoto,
  markOnboardingVehiclePhotoSkipped,
  storePendingOnboardingVehiclePhoto,
} from "@/lib/onboarding/pending-onboarding-vehicle-photo";
import { writeSilhouettePreviewToSession } from "@/lib/vehicles/silhouette-preview-session";
import { uploadVehiclePhotoClient } from "@/lib/vehicles/upload-vehicle-photo-client";
import type { BuildPersonalityChipId } from "@/lib/vehicles/build-personality-chips";
import { DEFAULT_OIL_INTERVAL_KM, DEFAULT_OIL_INTERVAL_MONTHS } from "@/lib/documents/oil-changes";
import { formatMileageKmNumber } from "@/lib/documents/format";
import {
  claimWizardPreviousStep,
  claimWizardStepIndex,
  claimWizardTotalSteps,
  type ClaimWizardFlowOptions,
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
  variant?: "tag" | "digital";
  tagUuid?: string;
  isAuthenticated?: boolean;
  userEmail?: string | null;
  /** When set, the profile-name step is skipped (dashboard greeting uses this). */
  initialDisplayName?: string | null;
}

export function ClaimFlow({
  variant = "tag",
  tagUuid,
  isAuthenticated = false,
  userEmail = null,
  initialDisplayName = null,
}: ClaimFlowProps) {
  const isDigital = variant === "digital";
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
  const [name, setName] = useState(() => initialDisplayName?.trim() ?? "");
  const [email, setEmail] = useState(userEmail ?? "");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [primaryGoal, setPrimaryGoal] = useState<ZeloxPrimaryGoal | null>(
    null,
  );
  const [buildPersonalityTags, setBuildPersonalityTags] = useState<
    BuildPersonalityChipId[]
  >([]);
  const [vehiclePhotoFile, setVehiclePhotoFile] = useState<File | null>(null);
  const [vehiclePhotoPreview, setVehiclePhotoPreview] = useState<string | null>(
    null,
  );
  const [vehiclePhotoSkipped, setVehiclePhotoSkipped] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const needsAccount = !isAuthenticated;
  /** Digital garage / register: always collect display name for dashboard greeting. */
  const includeProfileName = isDigital
    ? true
    : !initialDisplayName?.trim();
  const flowOptions: ClaimWizardFlowOptions = {
    needsAccount,
    includeProfileName,
  };

  function stepKicker(currentStep: ClaimWizardStep): string {
    const index = claimWizardStepIndex(currentStep, flowOptions);
    const total = claimWizardTotalSteps(flowOptions);
    return `Schritt ${index} von ${total}`;
  }

  function continueAfterPreferences() {
    if (includeProfileName) {
      advance("profileName");
      return;
    }
    if (needsAccount) {
      advance("account");
      return;
    }
    submitClaim();
  }

  function continueAfterProfileName() {
    if (needsAccount) {
      advance("account");
      return;
    }
    submitClaim();
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
    setStep(claimWizardPreviousStep(step, flowOptions));
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

  function validateProfileName(): string | null {
    if (!includeProfileName) return null;
    if (!name.trim()) {
      return "Bitte deinen Namen eingeben.";
    }
    if (name.trim().length < 2) {
      return "Name muss mindestens 2 Zeichen haben.";
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

  const techSpecsPayload = {
    powerPs: powerPs.trim() || undefined,
    displacementCc: displacementCc.trim() || undefined,
    drivetrain: drivetrain.trim() || undefined,
    fuelType: fuelType.trim() || undefined,
    oilChangeIntervalKm,
    oilChangeIntervalMonths,
    buildPersonalityTags:
      buildPersonalityTags.length > 0 ? buildPersonalityTags : undefined,
  };

  const ownerNamePayload = name.trim()
    ? { name: name.trim() }
    : {};

  const accountPayload = needsAccount
    ? {
        email: email.trim(),
        password,
        ...ownerNamePayload,
      }
    : ownerNamePayload;

  async function applyOnboardingVehiclePhoto(
    vehicleId: string,
    linkedTagUuid?: string,
  ) {
    if (vehiclePhotoFile) {
      try {
        const uploaded = await uploadVehiclePhotoClient({
          vehicleId,
          tagUuid: linkedTagUuid,
          file: vehiclePhotoFile,
        });
        if (uploaded.previewDataUrl?.startsWith("data:image/")) {
          writeSilhouettePreviewToSession(vehicleId, uploaded.previewDataUrl);
        }
        clearPendingOnboardingVehiclePhoto();
        clearOnboardingVehiclePhotoSkipped();
      } catch {
        await storePendingOnboardingVehiclePhoto(vehiclePhotoFile);
      }
      return;
    }
    if (vehiclePhotoSkipped) {
      markOnboardingVehiclePhotoSkipped();
    }
  }

  async function persistPhotoForDeferredSignup() {
    if (vehiclePhotoFile) {
      await storePendingOnboardingVehiclePhoto(vehiclePhotoFile);
      return;
    }
    if (vehiclePhotoSkipped) {
      markOnboardingVehiclePhotoSkipped();
    }
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

    const profileError = validateProfileName();
    if (profileError) {
      setError(profileError);
      if (includeProfileName) {
        setStep("profileName");
      }
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

    if (!isDigital && !tagUuid?.trim()) {
      setError("Tag-UUID fehlt.");
      return;
    }

    startTransition(async () => {
      try {
        const vehicleInput = {
          make,
          model,
          year,
          vin: vin.trim() || undefined,
          techSpecs: techSpecsPayload,
          ...accountPayload,
        };

        const result = isDigital
          ? await createDigitalGarageVehicle(vehicleInput)
          : await claimTag({ tagUuid: tagUuid!, ...vehicleInput });

        if (result.status === "error") {
          setError(result.message);
          return;
        }

        if (result.status === "confirm_email") {
          await persistPhotoForDeferredSignup();
          setInfo(result.message);
          return;
        }

        if (result.status !== "continue" || !("href" in result) || !result.href) {
          setError("Weiterleitung fehlgeschlagen.");
          return;
        }

        const vehicleId =
          typeof result.vehicleId === "string" ? result.vehicleId : null;
        if (vehicleId) {
          await applyOnboardingVehiclePhoto(
            vehicleId,
            isDigital ? undefined : tagUuid,
          );
        }

        window.location.replace(result.href);
      } catch (submitError) {
        setError(
          submitError instanceof Error
            ? submitError.message
            : "Weiterleitung fehlgeschlagen.",
        );
      }
    });
  }

  const finishLabel = isDigital
    ? pending
      ? "Wird angelegt…"
      : "Zu deinem Build"
    : pending
      ? "Verknüpfen…"
      : "Tag aktivieren";

  const showWizardChrome = step !== "intro";

  return (
    <ClaimShell intro={step === "intro"}>
      {showWizardChrome ? (
        <ClaimProgressBar step={step} flowOptions={flowOptions} />
      ) : null}

      {showWizardChrome ? (
        <ClaimTwinPreviewCard
          make={make}
          model={model}
          year={year}
          personalityTags={buildPersonalityTags}
          photoPreviewUrl={vehiclePhotoPreview}
        />
      ) : null}

      <ClaimStepTransition step={step} direction={transitionDirection}>
        {step === "intro" ? (
          <ClaimIntroHero
            variant={variant}
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
                advance("vehiclePhoto");
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
                advance("buildPersonality");
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
                submitLabel="Weiter"
                submitIcon="next"
                showBack
              />
            </form>
          </ClaimWizardPanel>
        ) : null}

        {step === "buildPersonality" ? (
          <ClaimWizardPanel
            kicker={stepKicker("buildPersonality")}
            title="Wie würdest du deinen Build nennen?"
            copy="Wähle bis zu fünf Vibes — sie erscheinen in deinem Showcase und beim Build-Swipe."
          >
            <form
              className="mt-6 grid w-full gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                setError(null);
                advance("preferences");
              }}
            >
              <BuildPersonalityChipPicker
                selected={buildPersonalityTags}
                onChange={setBuildPersonalityTags}
              />
              <ClaimSlideActions
                error={error}
                pending={pending}
                onBack={goBack}
                submitLabel="Weiter"
                submitIcon="next"
                showBack
              />
            </form>
          </ClaimWizardPanel>
        ) : null}

        {step === "vehiclePhoto" ? (
          <ClaimWizardPanel
            kicker={stepKicker("vehiclePhoto")}
            title="Fahrzeugfoto"
            copy="Zeig dein Auto im Dashboard — ein Foto aus Galerie oder Kamera reicht. Du kannst es auch gleich überspringen."
          >
            <form
              className="mt-6 grid w-full gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                setError(null);
                setVehiclePhotoSkipped(false);
                advance("year");
              }}
            >
              <ClaimVehiclePhotoPicker
                previewUrl={vehiclePhotoPreview}
                onPreviewChange={setVehiclePhotoPreview}
                onFileChange={(file) => {
                  setVehiclePhotoFile(file);
                  if (file) setVehiclePhotoSkipped(false);
                }}
                disabled={pending}
              />
              <button
                type="button"
                className="text-center text-[0.8rem] text-[color:var(--vd-muted)] underline-offset-2 hover:underline"
                disabled={pending}
                onClick={() => {
                  setVehiclePhotoFile(null);
                  setVehiclePhotoPreview(null);
                  setVehiclePhotoSkipped(true);
                  advance("year");
                }}
              >
                Später — ohne Foto fortfahren
              </button>
              <ClaimSlideActions
                error={error}
                pending={pending}
                onBack={goBack}
                submitLabel="Weiter"
                submitIcon="next"
                showBack
              />
            </form>
          </ClaimWizardPanel>
        ) : null}

        {step === "preferences" ? (
          <ClaimWizardPanel
            kicker={stepKicker("preferences")}
            title="Was ist dir am wichtigsten?"
            copy="Wir passen dein Dashboard und dein Erlebnis basierend auf der Antwort an."
          >
            <form
              className="mt-6 grid w-full gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                setError(null);
                if (!primaryGoal) {
                  setError("Bitte eine Option wählen.");
                  return;
                }
                writePrimaryGoal(primaryGoal);
                continueAfterPreferences();
              }}
            >
              <PrimaryGoalOptionList
                selected={primaryGoal}
                onSelect={setPrimaryGoal}
              />
              <ClaimSlideActions
                error={error}
                pending={pending}
                onBack={goBack}
                submitLabel={
                  includeProfileName || needsAccount
                    ? "Weiter"
                    : finishLabel
                }
                submitIcon={
                  includeProfileName || needsAccount ? "next" : "check"
                }
                showBack
              />
            </form>
          </ClaimWizardPanel>
        ) : null}

        {step === "profileName" ? (
          <ClaimWizardPanel
            kicker={stepKicker("profileName")}
            title="Wie sollen wir dich nennen?"
            copy="Dein Vorname erscheint im Dashboard — z. B. „Max' Supra“."
          >
            <form
              className="mt-6 grid w-full gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                setError(null);
                const validationError = validateProfileName();
                if (validationError) {
                  setError(validationError);
                  return;
                }
                continueAfterProfileName();
              }}
            >
              <ClaimField
                id="claim-profile-name"
                label="Name"
                value={name}
                onChange={setName}
                placeholder="Max"
                required
                autoComplete="name"
              />
              <ClaimSlideActions
                error={error}
                pending={pending}
                onBack={goBack}
                submitLabel={needsAccount ? "Weiter zum Konto" : finishLabel}
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

              <AuthLegalConsentNotice variant="claim" />

              <ClaimSlideActions
                error={null}
                pending={pending}
                onBack={goBack}
                submitLabel={
                  pending
                    ? "Konto wird angelegt…"
                    : isDigital
                      ? "Konto anlegen & zu deinem Build"
                      : "Konto anlegen & starten"
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
