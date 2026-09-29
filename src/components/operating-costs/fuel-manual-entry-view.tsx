"use client";

import { useState } from "react";
import { PenLine } from "lucide-react";

import { BackNav } from "@/components/layout/back-nav";
import { ScanContent } from "@/components/layout/scan-content";
import { useFuelFillSubmit } from "@/hooks/use-fuel-fill-submit";
import { emptyFuelFillFormState } from "@/lib/fuel-receipt/map-extraction-to-form";
import type { FuelFillFormState } from "@/lib/fuel-receipt/types";
import { PressableButton, PressableLink } from "@/components/vehicle-dashboard/Pressable";

import { FuelFillFormFields } from "./fuel-fill-form-fields";

type FuelManualEntryViewProps = {
  tagUuid: string;
  vehicleId: string;
  vehicleLabel: string;
  backHref?: string;
  entryId?: string;
  initialForm?: FuelFillFormState;
};

export function FuelManualEntryView({
  tagUuid,
  vehicleId,
  vehicleLabel,
  backHref,
  entryId,
  initialForm,
}: FuelManualEntryViewProps) {
  const isEdit = Boolean(entryId);
  const resolvedBackHref = backHref ?? `/v/${tagUuid}/tanken`;
  const [form, setForm] = useState<FuelFillFormState>(
    initialForm ?? emptyFuelFillFormState(),
  );
  const { submit, submitError, pending } = useFuelFillSubmit({
    tagUuid,
    vehicleId,
    backHref: resolvedBackHref,
    entryId,
  });

  return (
    <ScanContent className="pb-12">
      <header className="vd-anim-header space-y-4">
        <BackNav label="Tanken" href={resolvedBackHref} />

        <div className="vd-surface-card p-5">
          <div className="vd-icon-badge">
            <PenLine className="h-5 w-5" aria-hidden />
          </div>
          <p className="claim-kicker mt-4">Tanken</p>
          <h1 className="claim-title mt-2">
            {isEdit ? "Tankvorgang bearbeiten" : "Manuell eintragen"}
          </h1>
          <p className="claim-copy mt-1">
            {vehicleLabel}
            {isEdit ? "" : " · ohne Beleg-Scan"}
          </p>
        </div>
      </header>

      <form
        className="vd-anim-header space-y-4 rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-4 shadow-[var(--vd-shadow-sm)]"
        onSubmit={(event) => {
          event.preventDefault();
          submit(form);
        }}
      >
        <FuelFillFormFields
          value={form}
          onChange={setForm}
          disabled={pending}
        />

        {submitError ? (
          <p role="alert" className="vd-alert-error">{submitError}</p>
        ) : null}

        <PressableButton
          type="submit"
          disabled={pending}
          className="w-full rounded-2xl bg-neutral-950 py-3.5 text-[0.92rem] font-semibold text-white disabled:opacity-60"
        >
          {pending
            ? "Speichern…"
            : isEdit
              ? "Änderungen speichern"
              : "Tankvorgang speichern"}
        </PressableButton>
      </form>

      {!isEdit ? (
        <p className="text-center text-[0.78rem] text-[color:var(--vd-muted)]">
          <PressableLink
            href={`/v/${tagUuid}/tanken/erfassen`}
            className="font-medium text-[color:var(--vd-text)] underline decoration-[color:var(--vd-border)] underline-offset-4"
          >
            Stattdessen Tankbeleg scannen
          </PressableLink>
        </p>
      ) : null}
    </ScanContent>
  );
}
