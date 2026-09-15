"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Pencil } from "lucide-react";

import { updateManualOilChangeFields } from "@/actions/update-manual-oil-change-fields";
import { Input } from "@/components/ui/input";
import { PressableButton } from "@/components/vehicle-dashboard/Pressable";
import type { OilDetailEditTarget } from "@/lib/documents/oil-detail-edit";

const EDIT_TARGET: OilDetailEditTarget = "oilSpec";

type EditableOilSpecSectionProps = {
  documentId: string;
  vehicleId: string;
  tagUuid: string;
  oilSpec: string | null;
  onSaved?: (oilSpec: string | null) => void;
  hideEditTrigger?: boolean;
  editRequest?: OilDetailEditTarget | null;
  editPulse?: number;
  onEditRequestConsumed?: () => void;
  sectionId?: string;
};

export function EditableOilSpecSection({
  documentId,
  vehicleId,
  tagUuid,
  oilSpec,
  onSaved,
  hideEditTrigger = false,
  editRequest = null,
  editPulse = 0,
  onEditRequestConsumed,
  sectionId,
}: EditableOilSpecSectionProps) {
  const router = useRouter();
  const stored = oilSpec?.trim() || "";
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(stored);
  const [display, setDisplay] = useState(stored);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!editing) {
      setDraft(stored);
      setDisplay(stored);
    }
  }, [stored, editing]);

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
        patch: { oilSpec: draft.trim() },
      });
      if (result.status === "error") {
        setError(result.message);
        return;
      }
      const next = draft.trim();
      setDisplay(next);
      onSaved?.(next || null);
      setEditing(false);
      router.refresh();
    });
  }

  return (
    <div id={sectionId} className="scroll-mt-24 flex justify-between gap-3">
      {!editing ? (
        <>
          <dt className="text-[color:var(--vd-muted)]">Öl</dt>
          <dd className="max-w-[60%] text-right font-medium text-[color:var(--vd-text)]">
            {display || "—"}
          </dd>
        </>
      ) : (
        <div className="w-full space-y-2">
          <Input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="z. B. 5W-30 Longlife"
            maxLength={120}
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
      {!editing && !hideEditTrigger ? (
        <PressableButton
          type="button"
          variant="button"
          onClick={() => setEditing(true)}
          className="sr-only"
          aria-hidden
        >
          Bearbeiten
        </PressableButton>
      ) : null}
    </div>
  );
}
