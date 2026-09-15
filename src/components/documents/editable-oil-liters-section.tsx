"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { updateManualOilChangeFields } from "@/actions/update-manual-oil-change-fields";
import { Input } from "@/components/ui/input";
import { PressableButton } from "@/components/vehicle-dashboard/Pressable";
import type { OilDetailEditTarget } from "@/lib/documents/oil-detail-edit";

const EDIT_TARGET: OilDetailEditTarget = "oilLiters";

type EditableOilLitersSectionProps = {
  documentId: string;
  vehicleId: string;
  tagUuid: string;
  oilAmountLiters: number | null;
  onSaved?: (liters: number | null) => void;
  hideEditTrigger?: boolean;
  editRequest?: OilDetailEditTarget | null;
  editPulse?: number;
  onEditRequestConsumed?: () => void;
  sectionId?: string;
};

export function EditableOilLitersSection({
  documentId,
  vehicleId,
  tagUuid,
  oilAmountLiters,
  onSaved,
  editRequest = null,
  editPulse = 0,
  onEditRequestConsumed,
  sectionId,
}: EditableOilLitersSectionProps) {
  const router = useRouter();
  const stored =
    oilAmountLiters != null && oilAmountLiters > 0
      ? String(oilAmountLiters)
      : "";
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(stored);
  const [display, setDisplay] = useState(oilAmountLiters);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!editing) {
      setDraft(stored);
      setDisplay(oilAmountLiters);
    }
  }, [oilAmountLiters, stored, editing]);

  useEffect(() => {
    if (editRequest !== EDIT_TARGET || editPulse === 0) return;
    setEditing(true);
    onEditRequestConsumed?.();
  }, [editRequest, editPulse, onEditRequestConsumed]);

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await updateManualOilChangeFields({
        documentId,
        vehicleId,
        tagUuid,
        patch: { oilLiters: draft.trim() },
      });
      if (result.status === "error") {
        setError(result.message);
        return;
      }
      const parsed = Number.parseFloat(draft.replace(",", "."));
      const next = Number.isFinite(parsed) ? parsed : null;
      setDisplay(next);
      onSaved?.(next);
      setEditing(false);
      router.refresh();
    });
  }

  return (
    <div id={sectionId} className="scroll-mt-24 flex justify-between gap-3">
      {!editing ? (
        <>
          <dt className="text-[color:var(--vd-muted)]">Menge</dt>
          <dd className="font-medium text-[color:var(--vd-text)]">
            {display != null && display > 0
              ? `${display.toLocaleString("de-DE")} l`
              : "—"}
          </dd>
        </>
      ) : (
        <div className="w-full space-y-2">
          <Input
            inputMode="decimal"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="z. B. 5,5"
          />
          <div className="flex gap-2">
            <PressableButton
              type="button"
              variant="button"
              disabled={pending}
              onClick={handleSave}
              className="rounded-lg bg-neutral-900 px-3 py-1.5 text-[0.75rem] font-semibold text-white"
            >
              Speichern
            </PressableButton>
            <PressableButton
              type="button"
              variant="button"
              onClick={() => setEditing(false)}
              className="rounded-lg border px-3 py-1.5 text-[0.75rem]"
            >
              Abbrechen
            </PressableButton>
          </div>
          {error ? <p className="text-[0.75rem] text-red-700">{error}</p> : null}
        </div>
      )}
    </div>
  );
}
