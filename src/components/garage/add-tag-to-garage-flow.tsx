"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { claimTag } from "@/actions/claim-tag";
import { ClaimField, ClaimSlideActions } from "@/components/tags/claim/claim-form-fields";
import { ClaimShell } from "@/components/tags/claim/ClaimShell";
import { ClaimWizardPanel } from "@/components/tags/claim/ClaimWizardPanel";
import { DEFAULT_OIL_INTERVAL_KM, DEFAULT_OIL_INTERVAL_MONTHS } from "@/lib/documents/oil-changes";

type AddTagStep = "confirm" | "vehicle";

interface AddTagToGarageFlowProps {
  tagUuid: string;
}

export function AddTagToGarageFlow({ tagUuid }: AddTagToGarageFlowProps) {
  const router = useRouter();
  const [step, setStep] = useState<AddTagStep>("confirm");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [vin, setVin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

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

  function submitClaim() {
    const validationError = validateVehicle();
    if (validationError) {
      setError(validationError);
      return;
    }

    startTransition(async () => {
      setError(null);
      const result = await claimTag({
        tagUuid,
        make: make.trim(),
        model: model.trim(),
        year,
        vin: vin.trim() || undefined,
        techSpecs: {
          oilChangeIntervalKm: String(DEFAULT_OIL_INTERVAL_KM),
          oilChangeIntervalMonths: String(DEFAULT_OIL_INTERVAL_MONTHS),
        },
      });

      if (result.status === "error") {
        setError(result.message);
        return;
      }
      if (result.status === "confirm_email") {
        setError(result.message);
        return;
      }

      router.replace(result.href);
    });
  }

  return (
    <ClaimShell>
      {step === "confirm" ? (
        <ClaimWizardPanel
          kicker="ZeloxTag"
          title="Tag zur Garage hinzufügen"
          copy="Möchtest du diesen Tag deiner Garage hinzufügen? Im nächsten Schritt hinterlegst du kurz Marke, Modell und Baujahr für das neue Fahrzeug."
        >
          <form
            className="mt-6 grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              setError(null);
              setStep("vehicle");
            }}
          >
            {error ? (
              <p className="text-[0.85rem] text-red-400" role="alert">
                {error}
              </p>
            ) : null}
            <ClaimSlideActions
              error={null}
              pending={false}
              onBack={() => {}}
              submitLabel="Weiter"
              submitIcon="next"
              showBack={false}
            />
          </form>
        </ClaimWizardPanel>
      ) : null}

      {step === "vehicle" ? (
        <ClaimWizardPanel
          kicker="Fahrzeug"
          title="Neues Fahrzeug"
          copy="Diese Angaben erscheinen in deinem Dashboard und auf dem digitalen Zwilling."
        >
          <form
            className="mt-6 grid w-full gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              submitClaim();
            }}
          >
            <ClaimField
              id="garage-claim-make"
              label="Marke"
              value={make}
              onChange={setMake}
              required
              autoComplete="organization"
            />
            <ClaimField
              id="garage-claim-model"
              label="Modell"
              value={model}
              onChange={setModel}
              required
            />
            <ClaimField
              id="garage-claim-year"
              label="Baujahr"
              value={year}
              onChange={setYear}
              required
              inputMode="numeric"
            />
            <ClaimField
              id="garage-claim-vin"
              label="VIN (optional)"
              value={vin}
              onChange={setVin}
              autoComplete="off"
            />
            <ClaimSlideActions
              error={error}
              pending={pending}
              onBack={() => {
                setError(null);
                setStep("confirm");
              }}
              submitLabel={pending ? "Wird hinzugefügt…" : "Zur Garage hinzufügen"}
              submitIcon="check"
              showBack
            />
          </form>
        </ClaimWizardPanel>
      ) : null}
    </ClaimShell>
  );
}
