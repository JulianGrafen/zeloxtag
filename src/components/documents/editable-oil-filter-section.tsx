"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { updateManualOilChangeFields } from "@/actions/update-manual-oil-change-fields";
import { PressableButton } from "@/components/vehicle-dashboard/Pressable";
import type { OilDetailEditTarget } from "@/lib/documents/oil-detail-edit";

const EDIT_TARGET: OilDetailEditTarget = "filter";

type EditableOilFilterSectionProps = {
  documentId: string;
  vehicleId: string;
  tagUuid: string;
  filterChanged: boolean;
  onSaved?: (filterChanged: boolean) => void;
  editRequest?: OilDetailEditTarget | null;
  editPulse?: number;
  onEditRequestConsumed?: () => void;
  sectionId?: string;
};

export function EditableOilFilterSection({
  documentId,
  vehicleId,
  tagUuid,
  filterChanged: storedFilter,
  onSaved,
  editRequest = null,
  editPulse = 0,
  onEditRequestConsumed,
  sectionId,
}: EditableOilFilterSectionProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(storedFilter);
  const [display, setDisplay] = useState(storedFilter);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!editing) setDisplay(storedFilter);
  }, [storedFilter, editing]);

  useEffect(() => {
    if (editRequest !== EDIT_TARGET || editPulse === 0) return;
    setDraft(display);
    setEditing(true);
    onEditRequestConsumed?.();
  }, [editRequest, editPulse, onEditRequestConsumed, display]);

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await updateManualOilChangeFields({
        documentId,
        vehicleId,
        tagUuid,
        patch: { filterChanged: draft },
      });
      if (result.status === "error") {
        setError(result.message);
        return;
      }
      setDisplay(draft);
      onSaved?.(draft);
      setEditing(false);
      router.refresh();
    });
  }

  return (
    <div id={sectionId} className="scroll-mt-24 flex justify-between gap-3">
      {!editing ? (
        <>
          <dt className="text-[color:var(--vd-muted)]">Filter</dt>
          <dd className="font-medium text-[color:var(--vd-text)]">
            {display ? "Erneuert" : "Unverändert"}
          </dd>
        </>
      ) : (
        <div className="w-full space-y-2">
          <label className="flex items-center gap-2 text-[0.88rem]">
            <input
              type="checkbox"
              checked={draft}
              onChange={(event) => setDraft(event.target.checked)}
            />
            Filter gewechselt
          </label>
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
