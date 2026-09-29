"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { createGarageVehicleAction } from "@/actions/create-garage-vehicle";
import {
  ClaimField,
  ClaimSlideActions,
} from "@/components/tags/claim/claim-form-fields";
import { ClaimShell } from "@/components/tags/claim/ClaimShell";
import { ClaimWizardPanel } from "@/components/tags/claim/ClaimWizardPanel";

export function CreateGarageVehicleForm() {
  const router = useRouter();
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [vin, setVin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!make.trim() || !model.trim()) {
      setError("Marke und Modell sind erforderlich.");
      return;
    }
    const parsedYear = Number.parseInt(year, 10);
    if (!Number.isFinite(parsedYear) || parsedYear < 1900 || parsedYear > 2100) {
      setError("Baujahr muss zwischen 1900 und 2100 liegen.");
      return;
    }

    startTransition(async () => {
      setError(null);
      const result = await createGarageVehicleAction({
        make,
        model,
        year,
        vin: vin.trim() || undefined,
      });
      if (result.status === "error") {
        setError(result.message);
        return;
      }
      router.replace(result.href);
    });
  }

  return (
    <ClaimShell>
      <ClaimWizardPanel
        kicker="Garage"
        title="Dein Fahrzeug"
        copy="Leg dein Auto in der digitalen Garage an — ohne physischen Tag. Den V4A-Tag kannst du später verknüpfen oder bestellen."
      >
        <form
          className="mt-6 grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <ClaimField
            id="make"
            label="Marke"
            value={make}
            onChange={setMake}
            required
          />
          <ClaimField
            id="model"
            label="Modell"
            value={model}
            onChange={setModel}
            required
          />
          <ClaimField
            id="year"
            label="Baujahr"
            value={year}
            onChange={setYear}
            inputMode="numeric"
            required
          />
          <ClaimField
            id="vin"
            label="VIN (optional)"
            value={vin}
            onChange={setVin}
          />
          <ClaimSlideActions
            error={error}
            pending={pending}
            onBack={() => {}}
            submitLabel="Garage öffnen"
            showBack={false}
          />
        </form>
      </ClaimWizardPanel>
    </ClaimShell>
  );
}
