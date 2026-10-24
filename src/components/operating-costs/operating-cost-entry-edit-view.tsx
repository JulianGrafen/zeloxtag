"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { updateOperatingCost } from "@/actions/operating-costs";
import { BackNav } from "@/components/layout/back-nav";
import { ScanContent } from "@/components/layout/scan-content";
import { PressableButton } from "@/components/vehicle-dashboard/Pressable";
import type { OperatingCostFormInput } from "@/lib/vehicles/operating-costs/types";
import { OPERATING_COST_CATEGORY_LABELS } from "@/lib/vehicles/operating-costs/types";
import { showSavedToast } from "@/lib/ui/saved-toast";

import { OperatingCostFormFields } from "./operating-cost-form-fields";

type OperatingCostEntryEditViewProps = {
  tagUuid: string;
  vehicleId: string;
  vehicleLabel: string;
  backHref: string;
  entryId: string;
  initialForm: OperatingCostFormInput;
};

export function OperatingCostEntryEditView({
  tagUuid,
  vehicleId,
  vehicleLabel,
  backHref,
  entryId,
  initialForm,
}: OperatingCostEntryEditViewProps) {
  const router = useRouter();
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const categoryLabel = OPERATING_COST_CATEGORY_LABELS[form.category];

  return (
    <ScanContent className="pb-12">
      <header className="vd-anim-header space-y-4">
        <BackNav label="Kosten" href={backHref} />

        <div className="vd-surface-card p-5">
          <p className="claim-kicker">Betriebskosten</p>
          <h1 className="claim-title mt-2">Eintrag bearbeiten</h1>
          <p className="claim-copy mt-1">
            {vehicleLabel} · {categoryLabel}
          </p>
        </div>
      </header>

      <form
        className="vd-anim-header space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);
          startTransition(async () => {
            const result = await updateOperatingCost({
              tagUuid,
              vehicleId,
              entryId,
              form,
            });
            if (result.status === "error") {
              setError(result.message);
              return;
            }
            showSavedToast();
            router.push(backHref);
            router.refresh();
          });
        }}
      >
        <OperatingCostFormFields
          value={form}
          onChange={setForm}
          lockCategory
        />
        {error ? (
          <p role="alert" className="vd-alert-error">{error}</p>
        ) : null}
        <PressableButton
          type="submit"
          disabled={pending}
          className="w-full rounded-2xl bg-neutral-950 py-3.5 text-[0.92rem] font-semibold text-white disabled:opacity-60"
        >
          {pending ? "Speichern…" : "Änderungen speichern"}
        </PressableButton>
      </form>
    </ScanContent>
  );
}
